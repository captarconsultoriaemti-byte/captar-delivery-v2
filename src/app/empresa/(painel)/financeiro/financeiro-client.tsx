"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Periodo = "hoje" | "semana" | "mes" | "personalizado";

interface Pedido {
  id: string;
  total: number;
  forma_pagamento: string | null;
  origem: "balcao" | "link";
  closed_at: string;
  cliente_nome: string | null;
}

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "semana", label: "Esta semana" },
  { id: "mes", label: "Este mês" },
  { id: "personalizado", label: "Personalizado" },
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function FinanceiroClient({
  pedidos,
  periodo,
  de,
  ate,
}: {
  pedidos: Pedido[];
  periodo: Periodo;
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const [deInput, setDeInput] = useState(de);
  const [ateInput, setAteInput] = useState(ate);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  function mudarPeriodo(novoPeriodo: Periodo) {
    if (novoPeriodo === "personalizado") {
      router.push(`/empresa/financeiro?periodo=personalizado&de=${deInput}&ate=${ateInput}`);
      return;
    }
    router.push(`/empresa/financeiro?periodo=${novoPeriodo}`);
  }

  function aplicarPersonalizado() {
    if (!deInput || !ateInput) return;
    router.push(`/empresa/financeiro?periodo=personalizado&de=${deInput}&ate=${ateInput}`);
  }

  const total = useMemo(() => pedidos.reduce((soma, p) => soma + p.total, 0), [pedidos]);
  const quantidade = pedidos.length;
  const ticketMedio = quantidade > 0 ? total / quantidade : 0;

  const porFormaPagamento = useMemo(() => {
    const mapa = new Map<string, { quantidade: number; total: number }>();
    for (const p of pedidos) {
      const chave = p.forma_pagamento || "Não informado";
      const atual = mapa.get(chave) ?? { quantidade: 0, total: 0 };
      mapa.set(chave, { quantidade: atual.quantidade + 1, total: atual.total + p.total });
    }
    return Array.from(mapa.entries()).map(([forma, dados]) => ({ forma, ...dados }));
  }, [pedidos]);

  const porOrigem = useMemo(() => {
    const mapa = new Map<string, { quantidade: number; total: number }>();
    for (const p of pedidos) {
      const chave = p.origem === "link" ? "Link (online)" : "Balcão";
      const atual = mapa.get(chave) ?? { quantidade: 0, total: 0 };
      mapa.set(chave, { quantidade: atual.quantidade + 1, total: atual.total + p.total });
    }
    return Array.from(mapa.entries()).map(([origem, dados]) => ({ origem, ...dados }));
  }, [pedidos]);

  async function handleBaixarPdf() {
    setGerandoPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF();
      const periodoLabel = PERIODOS.find((p) => p.id === periodo)?.label ?? periodo;

      doc.setFontSize(16);
      doc.text("Relatório Financeiro", 14, 18);
      doc.setFontSize(10);
      doc.text(`Período: ${periodoLabel}`, 14, 26);

      autoTable(doc, {
        startY: 32,
        head: [["Resumo", "Valor"]],
        body: [
          ["Faturamento total", formatarMoeda(total)],
          ["Número de pedidos", String(quantidade)],
          ["Ticket médio", formatarMoeda(ticketMedio)],
        ],
      });

      const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: y1,
        head: [["Forma de pagamento", "Pedidos", "Total"]],
        body: porFormaPagamento.map((f) => [f.forma, String(f.quantidade), formatarMoeda(f.total)]),
      });

      const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: y2,
        head: [["Origem", "Pedidos", "Total"]],
        body: porOrigem.map((o) => [o.origem, String(o.quantidade), formatarMoeda(o.total)]),
      });

      const y3 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
      autoTable(doc, {
        startY: y3,
        head: [["Data", "Cliente", "Total"]],
        body: pedidos.map((p) => [
          formatarData(p.closed_at),
          p.cliente_nome || "-",
          formatarMoeda(p.total),
        ]),
      });

      doc.save(`financeiro-${periodo}.pdf`);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => mudarPeriodo(p.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                periodo === p.id ? "bg-primary text-white" : "bg-secondary/10 text-secondary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          onClick={handleBaixarPdf}
          disabled={gerandoPdf || pedidos.length === 0}
          className="flex items-center gap-2"
        >
          <Download size={16} />
          {gerandoPdf ? "Gerando..." : "Baixar PDF"}
        </Button>
      </div>

      {periodo === "personalizado" && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-secondary/40 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">De</label>
            <input
              type="date"
              value={deInput}
              onChange={(e) => setDeInput(e.target.value)}
              className="rounded-md border border-secondary/55 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">Até</label>
            <input
              type="date"
              value={ateInput}
              onChange={(e) => setAteInput(e.target.value)}
              className="rounded-md border border-secondary/55 px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={aplicarPersonalizado}>Aplicar</Button>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-secondary/40 bg-white p-6">
          <p className="mb-1 text-sm text-secondary">Faturamento total</p>
          <p className="text-2xl font-bold text-primary">{formatarMoeda(total)}</p>
        </div>
        <div className="rounded-lg border border-secondary/40 bg-white p-6">
          <p className="mb-1 text-sm text-secondary">Número de pedidos</p>
          <p className="text-2xl font-bold text-primary">{quantidade}</p>
        </div>
        <div className="rounded-lg border border-secondary/40 bg-white p-6">
          <p className="mb-1 text-sm text-secondary">Ticket médio</p>
          <p className="text-2xl font-bold text-primary">{formatarMoeda(ticketMedio)}</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-secondary/40 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Por forma de pagamento</p>
          {porFormaPagamento.length === 0 ? (
            <p className="text-sm text-secondary">Nenhum pedido no período.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody>
                {porFormaPagamento.map((f) => (
                  <tr key={f.forma} className="border-b border-secondary/30">
                    <td className="py-1.5">{f.forma}</td>
                    <td className="py-1.5 text-secondary">{f.quantidade} pedido(s)</td>
                    <td className="py-1.5 text-right font-medium">{formatarMoeda(f.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border border-secondary/40 bg-white p-4">
          <p className="mb-2 text-sm font-semibold">Por origem</p>
          {porOrigem.length === 0 ? (
            <p className="text-sm text-secondary">Nenhum pedido no período.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <tbody>
                {porOrigem.map((o) => (
                  <tr key={o.origem} className="border-b border-secondary/30">
                    <td className="py-1.5">{o.origem}</td>
                    <td className="py-1.5 text-secondary">{o.quantidade} pedido(s)</td>
                    <td className="py-1.5 text-right font-medium">{formatarMoeda(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">Pedidos do período</p>
        {pedidos.length === 0 ? (
          <p className="text-sm text-secondary">Nenhum pedido no período.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-secondary/45 text-secondary">
                <th className="py-2 pr-4 font-medium">Data</th>
                <th className="py-2 pr-4 font-medium">Cliente</th>
                <th className="py-2 pr-4 font-medium">Origem</th>
                <th className="py-2 pr-4 font-medium">Pagamento</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id} className="border-b border-secondary/30">
                  <td className="py-1.5 pr-4">{formatarData(p.closed_at)}</td>
                  <td className="py-1.5 pr-4">{p.cliente_nome || "-"}</td>
                  <td className="py-1.5 pr-4">{p.origem === "link" ? "Link" : "Balcão"}</td>
                  <td className="py-1.5 pr-4">{p.forma_pagamento || "-"}</td>
                  <td className="py-1.5 text-right font-medium">{formatarMoeda(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
