"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";

export type EtapaLink = "novo" | "em_preparo" | "pronto" | "entregue" | "cancelado";

const ORDEM_ETAPAS: EtapaLink[] = ["novo", "em_preparo", "pronto", "entregue"];

export async function atualizarEtapaLink(
  pedidoId: string,
  etapa: EtapaLink,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const { data: pedidoAtual } = await supabase
    .from("pedidos")
    .select("etapa_link")
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id)
    .single();

  if (!pedidoAtual) return { error: "Pedido não encontrado." };

  const indiceAtual = ORDEM_ETAPAS.indexOf((pedidoAtual.etapa_link as EtapaLink) ?? "novo");
  const indiceNovo = ORDEM_ETAPAS.indexOf(etapa);

  if (indiceAtual < 0 || indiceNovo !== indiceAtual + 1) {
    return { error: "Não é possível voltar ou pular uma etapa do pedido." };
  }

  const dados =
    etapa === "entregue"
      ? { etapa_link: etapa, status: "fechado" as const, closed_at: new Date().toISOString() }
      : { etapa_link: etapa, status: "aberto" as const, closed_at: null };

  const { error } = await supabase
    .from("pedidos")
    .update(dados)
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos-online");
  return { data: true };
}

export async function cancelarPedido(
  pedidoId: string,
  senha: string,
  motivo: string,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (!motivo.trim()) return { error: "Informe o motivo do cancelamento." };

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();

  const { data: pedidoAtual } = await supabase
    .from("pedidos")
    .select("etapa_link")
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id)
    .single();

  if (!pedidoAtual) return { error: "Pedido não encontrado." };
  if (pedidoAtual.etapa_link === "entregue" || pedidoAtual.etapa_link === "cancelado") {
    return { error: "Esse pedido não pode mais ser cancelado." };
  }

  const { error } = await supabase
    .from("pedidos")
    .update({
      etapa_link: "cancelado",
      status: "fechado",
      closed_at: new Date().toISOString(),
      motivo_cancelamento: motivo,
      cancelamento_solicitado: false,
    })
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos-online");
  return { data: true };
}

export async function aceitarSolicitacaoCancelamento(
  pedidoId: string,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const { data: pedidoAtual } = await supabase
    .from("pedidos")
    .select("etapa_link, motivo_solicitacao_cancelamento")
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id)
    .single();

  if (!pedidoAtual) return { error: "Pedido não encontrado." };
  if (pedidoAtual.etapa_link === "entregue" || pedidoAtual.etapa_link === "cancelado") {
    return { error: "Esse pedido não pode mais ser cancelado." };
  }

  const { error } = await supabase
    .from("pedidos")
    .update({
      etapa_link: "cancelado",
      status: "fechado",
      closed_at: new Date().toISOString(),
      motivo_cancelamento: pedidoAtual.motivo_solicitacao_cancelamento,
      cancelamento_solicitado: false,
    })
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos-online");
  return { data: true };
}
