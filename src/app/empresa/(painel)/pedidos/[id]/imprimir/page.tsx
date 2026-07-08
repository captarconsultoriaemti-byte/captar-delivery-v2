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
        "id, cliente_nome, cliente_telefone, documento_fiscal, observacoes, total, forma_pagamento, origem, tipo_entrega, created_at, closed_at, logradouro, numero, complemento, bairro, cidade, estado, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(id, nome), combos(nome))",
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

  // busca o preco atual de cada adicional dos produtos do pedido, pra mostrar
  // o valor do opcional junto no comprovante (a impressao usa o preco vigente
  // do cardapio, nao um preco historico - o pedido nao guarda isso separado)
  const produtoIds = [
    ...new Set(
      (pedido.pedido_itens as unknown as { produtos: { id: string } | null }[])
        .map((item) => item.produtos?.id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const { data: vinculos } = produtoIds.length
    ? await supabase
        .from("produto_grupos_opcionais")
        .select("produto_id, grupos_opcionais(opcionais(nome, preco_adicional))")
        .in("produto_id", produtoIds)
    : { data: [] };

  const precosPorProduto = new Map<string, Record<string, number>>();
  for (const vinculo of (vinculos ?? []) as unknown as {
    produto_id: string;
    grupos_opcionais: { opcionais: { nome: string; preco_adicional: number }[] } | null;
  }[]) {
    const mapa = precosPorProduto.get(vinculo.produto_id) ?? {};
    for (const opcional of vinculo.grupos_opcionais?.opcionais ?? []) {
      mapa[opcional.nome] = opcional.preco_adicional;
    }
    precosPorProduto.set(vinculo.produto_id, mapa);
  }

  const pedidoComPrecos = {
    ...pedido,
    pedido_itens: (
      pedido.pedido_itens as unknown as { produtos: { id: string } | null }[]
    ).map((item) => ({
      ...item,
      opcionais_precos: item.produtos?.id ? precosPorProduto.get(item.produtos.id) : undefined,
    })),
  };

  return <ComprovanteClient pedido={pedidoComPrecos as never} empresa={empresa!} via={viaValida} />;
}
