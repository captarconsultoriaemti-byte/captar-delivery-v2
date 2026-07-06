"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Printer, X, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DetailModal, DetailField } from "@/components/ui/detail-modal";
import { PasswordInput } from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";
import {
  atualizarEtapaLink,
  cancelarPedido,
  aceitarSolicitacaoCancelamento,
  type EtapaLink,
} from "@/lib/actions/pedidos-online";
import { imprimirHtml } from "@/lib/qz";
import { gerarHtmlComprovante } from "@/lib/utils/comprovante-html";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";

type Via = "ambas" | "cliente" | "cozinha";

function abrirImpressao(pedidoId: string, via: Via) {
  window.open(`/empresa/pedidos/${pedidoId}/imprimir?via=${via}`, "_blank");
}

interface PedidoItem {
  id: string;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string | null;
  produtos: { nome: string } | null;
  combos: { nome: string } | null;
}

export interface Pedido {
  id: string;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  total: number;
  etapa_link: EtapaLink | null;
  created_at: string;
  tipo_entrega: "entrega" | "retirada";
  bairro: string | null;
  cidade: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  forma_pagamento: string | null;
  observacoes: string | null;
  cancelamento_solicitado: boolean;
  motivo_solicitacao_cancelamento: string | null;
  pedido_itens: PedidoItem[];
}

const COLUNAS: { id: EtapaLink; label: string; proximaLabel: string | null }[] = [
  { id: "novo", label: "Novo", proximaLabel: "Em preparo" },
  { id: "em_preparo", label: "Em preparo", proximaLabel: "Pronto" },
  { id: "pronto", label: "Pronto", proximaLabel: "Entregue" },
  { id: "entregue", label: "Entregue", proximaLabel: null },
];

const PROXIMA_ETAPA: Record<string, EtapaLink> = {
  novo: "em_preparo",
  em_preparo: "pronto",
  pronto: "entregue",
};

const COR_COLUNA: Record<string, string> = {
  novo: "border-blue-200 bg-blue-50",
  em_preparo: "border-amber-200 bg-amber-50",
  pronto: "border-green-200 bg-green-50",
  entregue: "border-secondary/45 bg-white",
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function nomeItem(item: PedidoItem) {
  return item.produtos?.nome ?? item.combos?.nome ?? "?";
}

function CardPedido({
  pedido,
  onImprimir,
  onVer,
  onAvancar,
  onCancelar,
  onSolicitacao,
}: {
  pedido: Pedido;
  onImprimir: (p: Pedido) => void;
  onVer: (p: Pedido) => void;
  onAvancar: (p: Pedido) => void;
  onCancelar: (p: Pedido) => void;
  onSolicitacao: (p: Pedido) => void;
}) {
  const etapa = pedido.etapa_link ?? "novo";
  const proxima = PROXIMA_ETAPA[etapa];
  const emAlerta = pedido.cancelamento_solicitado;

  return (
    <div
      className={`mb-2 rounded-md border p-3 text-sm shadow-sm ${
        emAlerta ? "border-danger bg-danger/10" : COR_COLUNA[etapa]
      }`}
    >
      {emAlerta && (
        <button
          type="button"
          onClick={() => onSolicitacao(pedido)}
          className="mb-2 flex w-full items-center gap-1.5 rounded-md bg-danger/15 px-2 py-1 text-xs font-semibold text-danger"
        >
          <AlertTriangle size={14} />
          Cliente solicitou cancelamento — clique para ver
        </button>
      )}
      <div className="mb-1 flex items-center justify-between">
        <p className="font-medium">{pedido.cliente_nome ?? "Cliente"}</p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-secondary">{formatarHora(pedido.created_at)}</span>
          <IconAction icon={Eye} label="Ver pedido" variant="secondary" onClick={() => onVer(pedido)} />
          <IconAction
            icon={Printer}
            label="Imprimir"
            variant="secondary"
            onClick={() => onImprimir(pedido)}
          />
        </div>
      </div>
      <span
        className={`mb-1 inline-block rounded-full px-1.5 py-0.5 text-xs font-medium ${
          pedido.tipo_entrega === "retirada"
            ? "bg-primary/15 text-primary"
            : "bg-secondary/15 text-secondary"
        }`}
      >
        {pedido.tipo_entrega === "retirada" ? "Retirada" : "Entrega"}
      </span>
      <p className="mb-1 text-xs text-secondary">
        {pedido.pedido_itens.reduce((soma, i) => soma + i.quantidade, 0)} item(ns) —{" "}
        {formatarMoeda(pedido.total)}
      </p>
      {pedido.tipo_entrega === "entrega" && (pedido.bairro || pedido.cidade) && (
        <p className="mb-2 text-xs text-secondary">
          {pedido.bairro} {pedido.cidade && `— ${pedido.cidade}`}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        {proxima && (
          <Button className="flex-1 !py-1.5 text-xs" onClick={() => onAvancar(pedido)}>
            Próximo: {COLUNAS.find((c) => c.id === proxima)?.label}
          </Button>
        )}
        {etapa !== "entregue" && (
          <IconAction
            icon={XCircle}
            label="Cancelar pedido"
            variant="danger"
            onClick={() => onCancelar(pedido)}
          />
        )}
      </div>
    </div>
  );
}

function Coluna({
  label,
  pedidos,
  ...handlers
}: {
  id: EtapaLink;
  label: string;
  pedidos: Pedido[];
  onImprimir: (p: Pedido) => void;
  onVer: (p: Pedido) => void;
  onAvancar: (p: Pedido) => void;
  onCancelar: (p: Pedido) => void;
  onSolicitacao: (p: Pedido) => void;
}) {
  return (
    <div className="min-h-[200px] flex-1 rounded-lg border border-secondary/40 bg-background-soft p-3">
      <p className="mb-3 text-sm font-semibold">
        {label} <span className="text-xs font-normal text-secondary">({pedidos.length})</span>
      </p>
      {pedidos.map((pedido) => (
        <CardPedido key={pedido.id} pedido={pedido} {...handlers} />
      ))}
    </div>
  );
}

export function PedidosOnlineClient({
  pedidos: pedidosIniciais,
  empresaId,
  empresaInfo,
  impressaoAutomatica,
  impressoraAutomatica,
}: {
  pedidos: Pedido[];
  empresaId: string;
  empresaInfo: { nome: string; mensagem_agradecimento: string | null };
  impressaoAutomatica: boolean;
  impressoraAutomatica: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pedidos, setPedidos] = useState(pedidosIniciais);
  const [imprimindo, setImprimindo] = useState<Pedido | null>(null);
  const [vendo, setVendo] = useState<Pedido | null>(null);
  const [avancando, setAvancando] = useState<Pedido | null>(null);
  const [cancelando, setCancelando] = useState<Pedido | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [senhaCancelamento, setSenhaCancelamento] = useState("");
  const [vendoSolicitacao, setVendoSolicitacao] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(false);

  const [prevPedidosIniciais, setPrevPedidosIniciais] = useState(pedidosIniciais);
  if (pedidosIniciais !== prevPedidosIniciais) {
    setPrevPedidosIniciais(pedidosIniciais);
    setPedidos(pedidosIniciais);
  }

  // imprime automaticamente pedidos novos que chegam pelo link, em tempo real,
  // enquanto a tela de Pedidos Online estiver aberta - so funciona se a empresa
  // tiver ativado a impressao automatica e o QZ Tray estiver rodando no PC
  useEffect(() => {
    if (!impressaoAutomatica || !impressoraAutomatica) return;

    const supabase = createClient();
    const canal = supabase
      .channel(`pedidos-novos-${empresaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pedidos",
          filter: `empresa_id=eq.${empresaId}`,
        },
        async (payload) => {
          const novoPedido = payload.new as { id: string; origem: string };
          if (novoPedido.origem !== "link") return;

          const { data: pedidoCompleto } = await supabase
            .from("pedidos")
            .select(
              "id, cliente_nome, cliente_telefone, observacoes, total, forma_pagamento, origem, tipo_entrega, created_at, closed_at, logradouro, numero, complemento, bairro, cidade, pedido_itens(quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(nome), combos(nome))",
            )
            .eq("id", novoPedido.id)
            .single();

          if (!pedidoCompleto) return;

          router.refresh();

          const html = gerarHtmlComprovante(
            {
              ...pedidoCompleto,
              origem: "link",
              documento_fiscal: null,
              pedido_itens: (
                pedidoCompleto.pedido_itens as unknown as {
                  quantidade: number;
                  preco_unitario: number;
                  opcionais_selecionados: string[];
                  observacao: string | null;
                  produtos: { nome: string } | null;
                  combos: { nome: string } | null;
                }[]
              ).map((item) => ({
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                opcionais_selecionados: item.opcionais_selecionados,
                observacao: item.observacao,
                nome: item.produtos?.nome ?? item.combos?.nome ?? "?",
              })),
            },
            empresaInfo,
            "ambas",
          );

          const result = await imprimirHtml(impressoraAutomatica, html);
          if (result.error) showToast("error", result.error);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, impressaoAutomatica, impressoraAutomatica]);

  async function handleConfirmarAvancar() {
    if (!avancando) return;
    const proxima = PROXIMA_ETAPA[avancando.etapa_link ?? "novo"];
    if (!proxima) return;

    setLoading(true);
    const result = await atualizarEtapaLink(avancando.id, proxima);
    setLoading(false);
    setAvancando(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    router.refresh();
    if (proxima === "entregue") showToast("success", "Pedido marcado como entregue.");
  }

  async function handleConfirmarCancelamento() {
    if (!cancelando) return;

    setLoading(true);
    const result = await cancelarPedido(cancelando.id, senhaCancelamento, motivoCancelamento);
    setLoading(false);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    setCancelando(null);
    setMotivoCancelamento("");
    setSenhaCancelamento("");
    showToast("success", "Pedido cancelado.");
    router.refresh();
  }

  async function handleAceitarSolicitacao() {
    if (!vendoSolicitacao) return;

    setLoading(true);
    const result = await aceitarSolicitacaoCancelamento(vendoSolicitacao.id);
    setLoading(false);
    setVendoSolicitacao(null);

    if (result.error) {
      showToast("error", result.error);
      return;
    }

    showToast("success", "Cancelamento aceito.");
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        {COLUNAS.map((coluna) => (
          <Coluna
            key={coluna.id}
            id={coluna.id}
            label={coluna.label}
            pedidos={pedidos.filter((p) => (p.etapa_link ?? "novo") === coluna.id)}
            onImprimir={setImprimindo}
            onVer={setVendo}
            onAvancar={setAvancando}
            onCancelar={setCancelando}
            onSolicitacao={setVendoSolicitacao}
          />
        ))}
      </div>

      {imprimindo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Imprimir pedido</h2>
              <IconAction icon={X} label="Fechar" onClick={() => setImprimindo(null)} />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  abrirImpressao(imprimindo.id, "ambas");
                  setImprimindo(null);
                }}
              >
                Imprimir as duas vias
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  abrirImpressao(imprimindo.id, "cliente");
                  setImprimindo(null);
                }}
              >
                Só via do cliente
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  abrirImpressao(imprimindo.id, "cozinha");
                  setImprimindo(null);
                }}
              >
                Só via da cozinha
              </Button>
            </div>
          </div>
        </div>
      )}

      {vendo && (
        <DetailModal title={`Pedido de ${vendo.cliente_nome ?? "Cliente"}`} onClose={() => setVendo(null)}>
          <DetailField label="Telefone" value={vendo.cliente_telefone} />
          <DetailField label="Horário" value={formatarHora(vendo.created_at)} />
          <DetailField label="Tipo" value={vendo.tipo_entrega === "retirada" ? "Retirada" : "Entrega"} />
          <DetailField label="Forma de pagamento" value={vendo.forma_pagamento} />
          {vendo.tipo_entrega === "entrega" && (
            <DetailField
              label="Endereço"
              fullWidth
              value={[vendo.logradouro, vendo.numero, vendo.complemento, vendo.bairro, vendo.cidade]
                .filter(Boolean)
                .join(", ")}
            />
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
                        {item.quantidade}x {nomeItem(item)}
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
                    {item.observacao && (
                      <p className="text-xs text-secondary">Obs: {item.observacao}</p>
                    )}
                  </li>
                ))}
              </ul>
            }
          />
          {vendo.observacoes && <DetailField label="Observações do pedido" fullWidth value={vendo.observacoes} />}
          <DetailField label="Total" value={formatarMoeda(vendo.total)} />
        </DetailModal>
      )}

      <ConfirmDialog
        open={avancando !== null}
        title={`Avançar pedido para ${
          avancando ? COLUNAS.find((c) => c.id === PROXIMA_ETAPA[avancando.etapa_link ?? "novo"])?.label : ""
        }?`}
        description="Depois de avançar não é possível voltar para a etapa anterior."
        confirmLabel="Avançar"
        loading={loading}
        onConfirm={handleConfirmarAvancar}
        onCancel={() => setAvancando(null)}
      />

      {cancelando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Cancelar pedido</h2>
            <p className="mt-2 text-sm text-secondary">
              Essa ação não pode ser desfeita. O motivo informado será exibido para o cliente.
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Motivo do cancelamento</label>
              <textarea
                autoFocus
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-secondary/40 p-2 text-sm"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium">Confirme sua senha para continuar</label>
              <PasswordInput value={senhaCancelamento} onChange={(e) => setSenhaCancelamento(e.target.value)} />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCancelando(null);
                  setMotivoCancelamento("");
                  setSenhaCancelamento("");
                }}
              >
                Voltar
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmarCancelamento}
                disabled={loading || !motivoCancelamento.trim() || senhaCancelamento.length === 0}
              >
                {loading ? "Verificando..." : "Cancelar pedido"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {vendoSolicitacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-foreground">Solicitação de cancelamento</h2>
            <p className="mt-2 text-sm text-secondary">
              {vendoSolicitacao.cliente_nome ?? "O cliente"} pediu para cancelar este pedido.
            </p>
            <p className="mt-3 rounded-md bg-background-soft p-3 text-sm">
              {vendoSolicitacao.motivo_solicitacao_cancelamento}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setVendoSolicitacao(null)}>
                Voltar
              </Button>
              <Button variant="danger" onClick={handleAceitarSolicitacao} disabled={loading}>
                {loading ? "Cancelando..." : "Aceitar cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
