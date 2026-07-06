import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ComprovanteClient, type Via } from "./comprovante-client";

export default async function ImprimirPedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string }>;
}) {
  const { id } = await params;
  const { via } = await searchParams;
  const viaValida: Via = via === "cliente" || via === "cozinha" ? via : "ambas";
  const profile = await getCurrentProfile();
  if (!profile?.empresa_id) notFound();

  const supabase = await createClient();

  const [{ data: pedido }, { data: empresa }] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, cliente_nome, cliente_telefone, documento_fiscal, observacoes, total, forma_pagamento, origem, tipo_entrega, created_at, closed_at, logradouro, numero, complemento, bairro, cidade, estado, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(nome), combos(nome))",
      )
      .eq("id", id)
      .eq("empresa_id", profile.empresa_id)
      .single(),
    supabase
      .from("empresas")
      .select("nome, mensagem_agradecimento")
      .eq("id", profile.empresa_id)
      .single(),
  ]);

  if (!pedido) notFound();

  return <ComprovanteClient pedido={pedido as never} empresa={empresa!} via={viaValida} />;
}
