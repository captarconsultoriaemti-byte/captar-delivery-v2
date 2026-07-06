"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";
import { NumberedTable } from "@/components/ui/numbered-table";
import { IconAction } from "@/components/ui/icon-action";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";

interface PedidoItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
  produtos: { nome: string } | null;
  combos: { nome: string } | null;
}

export interface PedidoHistorico {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  total: number;
  etapa_link: "entregue" | "cancelado";
  created_at: string;
  closed_at: string | null;
  tipo_entrega: "entrega" | "retirada";
  bairro: string | null;
  cidade: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  pedido_itens: PedidoItem[];
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function HistoricoClient({ pedidos, data }: { pedidos: PedidoHistorico[]; data: string }) {
  const router = useRouter();
  const [vendo, setVendo] = useState<PedidoHistorico | null>(null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-secondary/40 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-secondary">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => router.push(`/empresa/pedidos-online/historico?data=${e.target.value}`)}
            className="rounded-md border border-secondary/55 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <NumberedTable<PedidoHistorico>
          rows={pedidos}
          rowKey={(p) => p.id}
          emptyMessage="Nenhum pedido nessa data."
          columns={[
            { header: "Cliente", render: (p) => p.cliente_nome ?? "-" },
            {
              header: "Status",
              render: (p) =>
                p.etapa_link === "entregue" ? (
                  <span className="text-success">Entregue</span>
                ) : (
                  <span className="text-danger">Cancelado</span>
                ),
            },
            {
              header: "Total",
              render: (p) => formatarMoeda(p.total),
            },
            {
              header: "Horário",
              render: (p) => new Date(p.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            },
            {
              header: "Ações",
              render: (p) => (
                <IconAction icon={Eye} label="Ver detalhes" variant="secondary" onClick={() => setVendo(p)} />
              ),
            },
          ]}
        />
      </div>

      {vendo && (
        <DetailModal title={vendo.cliente_nome ?? "Cliente"} onClose={() => setVendo(null)}>
          <DetailField label="Telefone" value={vendo.cliente_telefone} />
          <DetailField
            label="Status"
            value={vendo.etapa_link === "entregue" ? "Entregue" : "Cancelado"}
          />
          <DetailField label="Horário" value={new Date(vendo.created_at).toLocaleString("pt-BR")} />
          <DetailField label="Forma de pagamento" value={vendo.forma_pagamento} />
          <DetailField label="Tipo" value={vendo.tipo_entrega === "retirada" ? "Retirada" : "Entrega"} />
          {vendo.tipo_entrega === "entrega" && (
            <DetailField
              label="Endereço"
              fullWidth
              value={[vendo.logradouro, vendo.numero, vendo.complemento, vendo.bairro, vendo.cidade]
                .filter(Boolean)
                .join(", ")}
            />
          )}
          {vendo.etapa_link === "cancelado" && (
            <DetailField label="Motivo do cancelamento" fullWidth value={vendo.motivo_cancelamento} />
          )}
          <DetailField
            label="Itens"
            fullWidth
            value={
              <ul className="mt-1 space-y-2">
                {vendo.pedido_itens.map((item) => (
                  <li key={item.id}>
                    <div className="flex justify-between">
                      <span>
                        {item.quantidade}x {item.produtos?.nome ?? item.combos?.nome ?? "?"}
                      </span>
                      <span className="text-secondary">
                        {formatarMoeda(item.preco_unitario * item.quantidade)}
                      </span>
                    </div>
                    {item.opcionais_selecionados.length > 0 && (
                      <p className="text-xs text-secondary">
                        {formatarOpcionaisComQuantidade(item.opcionais_selecionados)}
                      </p>
                    )}
                    {item.observacao && <p className="text-xs text-secondary">Obs: {item.observacao}</p>}
                  </li>
                ))}
              </ul>
            }
          />
          {vendo.observacoes && <DetailField label="Observações do pedido" fullWidth value={vendo.observacoes} />}
          <DetailField label="Total" value={formatarMoeda(vendo.total)} />
        </DetailModal>
      )}
    </div>
  );
}
