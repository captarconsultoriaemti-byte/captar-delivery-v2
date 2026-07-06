import { notFound } from "next/navigation";
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

export default async function AcompanhamentoPedidoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const admin = createAdminClient();

  const { data: empresa } = await admin.from("empresas").select("id, nome").eq("slug", slug).single();
  if (!empresa) notFound();

  const { data: pedido } = await admin
    .from("pedidos")
    .select(
      "id, total, etapa_link, cliente_nome, tipo_entrega, cidade, bairro, logradouro, numero, cancelamento_solicitado, motivo_cancelamento, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, produtos(nome), combos(nome))",
    )
    .eq("id", id)
    .eq("empresa_id", empresa.id)
    .single();

  if (!pedido) notFound();

  const cancelado = pedido.etapa_link === "cancelado";
  const etapaAtualIndex = cancelado ? -1 : ETAPAS_ORDEM.indexOf(pedido.etapa_link ?? "novo");

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
        <div className="flex justify-between border-t border-secondary/40 pt-3 text-sm font-semibold">
          <span>Total</span>
          <span>{formatarMoeda(pedido.total)}</span>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-secondary">
        {pedido.tipo_entrega === "retirada"
          ? "Retirada no local"
          : `Entrega: ${pedido.logradouro}, ${pedido.numero} — ${pedido.bairro}`}
      </p>
    </div>
  );
}
