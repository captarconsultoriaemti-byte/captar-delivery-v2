import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock, Home } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatarOpcionaisComQuantidade } from "@/lib/utils/opcionais";
import { RefreshControls } from "./refresh-controls";
import { CancelamentoControls } from "./cancelamento-controls";

const ETAPA_LABEL: Record<string, string> = {
  novo: "Recebido",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  entregue: "Entregue",
};

const ETAPAS_ORDEM = ["novo", "em_preparo", "pronto", "entregue"];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarHora(data: Date) {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// etapa "em_preparo" tem exibicao propria (com relogio), entao nao passa por
// aqui - ver bloco especial no render. So mostra a frase da etapa atual.
function fraseEtapaAtual(
  etapaAtual: string,
  tipoEntrega: "entrega" | "retirada",
  tempoMedioEntrega: string | null,
): string {
  switch (etapaAtual) {
    case "novo":
      return "Aguardando confirmação da loja";
    case "pronto":
      if (tipoEntrega === "retirada") return "Pode retirar quando quiser!";
      return tempoMedioEntrega ? `Chegada estimada: ${tempoMedioEntrega}` : "Saiu para entrega";
    case "entregue":
      return "Pedido entregue!";
    default:
      return "";
  }
}

export default async function AcompanhamentoPedidoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const admin = createAdminClient();

  const { data: empresa } = await admin
    .from("empresas")
    .select("id, nome, tempo_estimado_preparo, tempo_medio_entrega")
    .eq("slug", slug)
    .single();
  if (!empresa) notFound();

  const { data: pedido } = await admin
    .from("pedidos")
    .select(
      "id, total, taxa_entrega, etapa_link, created_at, cliente_nome, cliente_telefone, documento_fiscal, tipo_entrega, cidade, bairro, logradouro, numero, complemento, forma_pagamento, cancelamento_solicitado, motivo_cancelamento, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, produtos(nome), combos(nome))",
    )
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .single();

  if (!pedido) notFound();

  const cancelado = pedido.etapa_link === "cancelado";
  const etapaAtualIndex = cancelado ? -1 : ETAPAS_ORDEM.indexOf(pedido.etapa_link ?? "novo");
  // componente de servidor: roda de novo a cada request, entao new Date() aqui
  // reflete a hora real da consulta, sem risco de "congelar" num re-render de cliente
  const agora = new Date();
  const horaCriacao = new Date(pedido.created_at);
  const previsaoEnvio = empresa.tempo_estimado_preparo
    ? new Date(horaCriacao.getTime() + empresa.tempo_estimado_preparo * 60000)
    : null;
  const emPreparoAtrasado =
    etapaAtualIndex === ETAPAS_ORDEM.indexOf("em_preparo") &&
    previsaoEnvio !== null &&
    agora > previsaoEnvio;

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <h1 className="mb-1 text-xl font-bold">{empresa.nome}</h1>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-secondary">Acompanhamento do pedido</p>
        <RefreshControls slug={slug} etapa={pedido.etapa_link ?? "novo"} />
      </div>

      {cancelado ? (
        <div className="mb-6 rounded-lg border border-danger/40 bg-danger/10 p-4">
          <p className="text-sm font-semibold text-danger">Pedido cancelado</p>
          {pedido.motivo_cancelamento && (
            <p className="mt-1 text-sm text-danger">Motivo: {pedido.motivo_cancelamento}</p>
          )}
          <div className="mt-3 text-center">
            <Link
              href={`/loja/${slug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <Home size={16} />
              Voltar para o início
            </Link>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-secondary/40 bg-white p-4">
          <div className="flex justify-between text-xs">
            {ETAPAS_ORDEM.map((etapa, index) => (
              <div key={etapa} className="flex flex-1 flex-col items-center">
                <div
                  className={`mb-1 h-3 w-3 rounded-full ${
                    index <= etapaAtualIndex ? "bg-primary" : "bg-secondary/20"
                  }`}
                />
                <span className={index <= etapaAtualIndex ? "font-medium text-primary" : "text-secondary"}>
                  {ETAPA_LABEL[etapa]}
                </span>
              </div>
            ))}
          </div>

          {pedido.etapa_link === "em_preparo" ? (
            <div
              className={`mt-3 flex items-start gap-2 rounded-md p-2 text-sm ${
                emPreparoAtrasado ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
              }`}
            >
              <Clock size={16} className="mt-0.5 shrink-0" />
              <div className="font-medium">
                <p>Foi para preparo às {formatarHora(horaCriacao)}</p>
                {previsaoEnvio ? (
                  <p>
                    {emPreparoAtrasado
                      ? `Em atraso — previsto para ${formatarHora(previsaoEnvio)}`
                      : `Previsão de envio até ${formatarHora(previsaoEnvio)}`}
                  </p>
                ) : (
                  <p>Em preparo, aguarde</p>
                )}
              </div>
            </div>
          ) : (
            !pedido.cancelamento_solicitado && (
              <p className="mt-3 text-center text-sm font-medium text-primary">
                {fraseEtapaAtual(pedido.etapa_link ?? "novo", pedido.tipo_entrega, empresa.tempo_medio_entrega)}
              </p>
            )
          )}

          <CancelamentoControls
            slug={slug}
            pedidoId={pedido.id}
            etapa={pedido.etapa_link ?? "novo"}
            cancelamentoSolicitado={pedido.cancelamento_solicitado}
          />
        </div>
      )}

      <div className="rounded-lg border border-secondary/40 bg-white p-4">
        <p className="mb-2 text-sm font-semibold">
          Itens do pedido
        </p>
        <ul className="mb-4 text-sm">
          {(
            pedido.pedido_itens as unknown as {
              quantidade: number;
              preco_unitario: number;
              opcionais_selecionados: string[];
              produtos: { nome: string } | null;
              combos: { nome: string } | null;
            }[]
          ).map((item, index) => (
            <li key={index} className="border-b border-secondary/30 py-1.5">
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
            </li>
          ))}
        </ul>
        {pedido.tipo_entrega === "entrega" && (
          <div className="flex justify-between border-t border-secondary/40 pt-3 text-sm text-secondary">
            <span>Taxa de entrega</span>
            <span>{formatarMoeda(pedido.taxa_entrega)}</span>
          </div>
        )}
        <div
          className={`flex justify-between pt-1.5 text-sm font-semibold ${
            pedido.tipo_entrega !== "entrega" ? "border-t border-secondary/40 pt-3" : ""
          }`}
        >
          <span>Total</span>
          <span>{formatarMoeda(pedido.total)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-secondary/40 bg-white p-4 text-sm">
        <p className="mb-2 font-semibold">Detalhes do pedido</p>
        <div className="flex flex-col gap-1.5 text-secondary">
          <p>
            <span className="font-medium text-foreground">Cliente:</span> {pedido.cliente_nome}
            {pedido.cliente_telefone && ` — ${pedido.cliente_telefone}`}
          </p>
          {pedido.documento_fiscal && (
            <p>
              <span className="font-medium text-foreground">CPF:</span> {pedido.documento_fiscal}
            </p>
          )}
          <p>
            <span className="font-medium text-foreground">Forma de pagamento:</span>{" "}
            {pedido.forma_pagamento ?? "-"}
          </p>
          <p>
            <span className="font-medium text-foreground">
              {pedido.tipo_entrega === "retirada" ? "Retirada" : "Entrega"}:
            </span>{" "}
            {pedido.tipo_entrega === "retirada"
              ? "Retirada no local"
              : [pedido.logradouro, pedido.numero, pedido.complemento, pedido.bairro, pedido.cidade]
                  .filter(Boolean)
                  .join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}
