"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/actions/shared";
import { calcularPrecoFinal } from "@/lib/utils/desconto";
import { calcularStatusFuncionamento, normalizarHorarios } from "@/lib/utils/horario";
import { normalizarBairro } from "@/lib/utils/endereco";

export interface ItemCarrinhoLoja {
  produto_id: string | null;
  combo_id: string | null;
  quantidade: number;
  opcionais_selecionados: string[];
  observacao: string;
}

interface EnderecoInput {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

interface CriarPedidoLinkInput {
  clienteNome: string;
  clienteWhatsapp: string;
  clienteCpf: string;
  tipoEntrega: "entrega" | "retirada";
  endereco: EnderecoInput;
  observacao: string;
  formaPagamento: string;
  itens: ItemCarrinhoLoja[];
}

interface VinculoOpcionais {
  produto_id: string;
  grupos_opcionais:
    | { opcionais: { nome: string; preco_adicional: number }[] }
    | { opcionais: { nome: string; preco_adicional: number }[] }[]
    | null;
}

async function buscarEmpresaAtivaPorSlug(admin: ReturnType<typeof createAdminClient>, slug: string) {
  const { data: empresa } = await admin
    .from("empresas")
    .select("id, status, pausa_manual, horario_funcionamento, taxa_entrega_padrao")
    .eq("slug", slug)
    .single();

  if (!empresa || empresa.status === "suspended" || empresa.status === "cancelled") return null;

  const { aberto } = calcularStatusFuncionamento(
    normalizarHorarios(empresa.horario_funcionamento ?? []),
    empresa.pausa_manual,
  );
  if (!aberto) return null;

  return empresa;
}

// nunca confia no valor de taxa de entrega que vem do cliente: recalcula
// sempre a partir do bairro cadastrado, com fallback pra taxa padrao da empresa
async function calcularTaxaEntrega(
  admin: ReturnType<typeof createAdminClient>,
  empresaId: string,
  tipoEntrega: "entrega" | "retirada",
  bairro: string,
  taxaPadrao: number,
): Promise<number> {
  if (tipoEntrega !== "entrega") return 0;
  if (!bairro.trim()) return taxaPadrao;

  const { data: bairroEntrega } = await admin
    .from("bairros_entrega")
    .select("valor")
    .eq("empresa_id", empresaId)
    .eq("bairro_normalizado", normalizarBairro(bairro))
    .maybeSingle();

  return bairroEntrega?.valor ?? taxaPadrao;
}

// mesma logica de pedidos.ts: preco sempre recalculado no servidor a partir do
// cardapio atual, nunca confia no valor que vem do carrinho do cliente
async function revalidarPrecos(
  admin: ReturnType<typeof createAdminClient>,
  empresaId: string,
  itens: ItemCarrinhoLoja[],
): Promise<{ itens: (ItemCarrinhoLoja & { preco_unitario: number })[] } | { error: string }> {
  const produtoIds = itens.filter((i) => i.produto_id).map((i) => i.produto_id!);
  const comboIds = itens.filter((i) => i.combo_id).map((i) => i.combo_id!);

  const [{ data: produtos }, { data: combos }, { data: vinculos }] = await Promise.all([
    produtoIds.length
      ? admin
          .from("produtos")
          .select("id, preco, ativo, tem_desconto, desconto_tipo, desconto_valor")
          .eq("empresa_id", empresaId)
          .in("id", produtoIds)
      : Promise.resolve({ data: [] as { id: string; preco: number; ativo: boolean; tem_desconto: boolean; desconto_tipo: "percentual" | "valor" | null; desconto_valor: number | null }[] }),
    comboIds.length
      ? admin.from("combos").select("id, preco, ativo").eq("empresa_id", empresaId).in("id", comboIds)
      : Promise.resolve({ data: [] as { id: string; preco: number; ativo: boolean }[] }),
    produtoIds.length
      ? admin
          .from("produto_grupos_opcionais")
          .select("produto_id, grupos_opcionais(opcionais(nome, preco_adicional))")
          .in("produto_id", produtoIds)
      : Promise.resolve({ data: [] as VinculoOpcionais[] }),
  ]);

  const produtoPorId = new Map((produtos ?? []).map((p) => [p.id, p]));
  const comboPorId = new Map((combos ?? []).map((c) => [c.id, c]));

  const opcionaisPorProduto = new Map<string, Map<string, number>>();
  for (const vinculo of (vinculos ?? []) as unknown as VinculoOpcionais[]) {
    if (!opcionaisPorProduto.has(vinculo.produto_id)) {
      opcionaisPorProduto.set(vinculo.produto_id, new Map());
    }
    const mapaDoProduto = opcionaisPorProduto.get(vinculo.produto_id)!;
    const grupo = Array.isArray(vinculo.grupos_opcionais)
      ? vinculo.grupos_opcionais[0]
      : vinculo.grupos_opcionais;
    for (const opcional of grupo?.opcionais ?? []) {
      mapaDoProduto.set(opcional.nome, opcional.preco_adicional);
    }
  }

  const itensRevalidados: (ItemCarrinhoLoja & { preco_unitario: number })[] = [];
  for (const item of itens) {
    if (item.produto_id) {
      const produto = produtoPorId.get(item.produto_id);
      if (!produto || !produto.ativo) {
        return { error: "Um dos itens do pedido não está mais disponível no cardápio." };
      }
      const precoBase = calcularPrecoFinal(produto.preco, produto);
      const precoOpcionaisMap = opcionaisPorProduto.get(item.produto_id);
      const precoOpcionais = item.opcionais_selecionados.reduce(
        (soma, nome) => soma + (precoOpcionaisMap?.get(nome) ?? 0),
        0,
      );
      itensRevalidados.push({ ...item, preco_unitario: precoBase + precoOpcionais });
    } else if (item.combo_id) {
      const combo = comboPorId.get(item.combo_id);
      if (!combo || !combo.ativo) {
        return { error: "Um dos combos do pedido não está mais disponível." };
      }
      itensRevalidados.push({ ...item, preco_unitario: combo.preco });
    } else {
      return { error: "Item de pedido inválido." };
    }
  }

  return { itens: itensRevalidados };
}

export async function criarPedidoLink(
  slug: string,
  input: CriarPedidoLinkInput,
): Promise<ActionResult<{ id: string }>> {
  if (!input.clienteNome.trim()) return { error: "Informe seu nome." };
  if (!input.clienteWhatsapp.trim()) return { error: "Informe seu WhatsApp." };
  if (input.itens.length === 0) return { error: "Adicione pelo menos um item ao pedido." };

  if (input.tipoEntrega === "entrega") {
    const { logradouro, numero, bairro, cidade, estado } = input.endereco;
    if (!logradouro.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !estado.trim()) {
      return { error: "Preencha o endereço de entrega completo." };
    }
  }

  const admin = createAdminClient();

  const empresa = await buscarEmpresaAtivaPorSlug(admin, slug);
  if (!empresa) return { error: "A loja está fechada no momento." };

  const revalidacao = await revalidarPrecos(admin, empresa.id, input.itens);
  if ("error" in revalidacao) return revalidacao;
  const itens = revalidacao.itens;

  const taxaEntrega = await calcularTaxaEntrega(
    admin,
    empresa.id,
    input.tipoEntrega,
    input.endereco.bairro,
    empresa.taxa_entrega_padrao,
  );

  const total =
    itens.reduce((soma, item) => soma + item.preco_unitario * item.quantidade, 0) + taxaEntrega;

  const whatsappDigits = input.clienteWhatsapp.replace(/\D/g, "");

  const { data: clienteExistente } = await admin
    .from("clientes")
    .select("id")
    .eq("empresa_id", empresa.id)
    .eq("whatsapp", input.clienteWhatsapp)
    .maybeSingle();

  let clienteId = clienteExistente?.id ?? null;

  const dadosCliente = {
    empresa_id: empresa.id,
    nome: input.clienteNome,
    whatsapp: input.clienteWhatsapp,
    ...(input.clienteCpf.trim() ? { cpf: input.clienteCpf } : {}),
    ...(input.tipoEntrega === "entrega"
      ? {
          cep: input.endereco.cep,
          logradouro: input.endereco.logradouro,
          numero: input.endereco.numero,
          complemento: input.endereco.complemento,
          bairro: input.endereco.bairro,
          cidade: input.endereco.cidade,
          estado: input.endereco.estado,
        }
      : {}),
  };

  if (clienteId) {
    await admin.from("clientes").update(dadosCliente).eq("id", clienteId);
  } else if (whatsappDigits) {
    const { data: novoCliente } = await admin
      .from("clientes")
      .insert(dadosCliente)
      .select("id")
      .single();
    clienteId = novoCliente?.id ?? null;
  }

  const { data: pedido, error } = await admin
    .from("pedidos")
    .insert({
      empresa_id: empresa.id,
      origem: "link",
      status: "aberto",
      etapa_link: "novo",
      cliente_id: clienteId,
      cliente_nome: input.clienteNome,
      cliente_telefone: input.clienteWhatsapp,
      documento_fiscal: input.clienteCpf.trim() || null,
      observacoes: input.observacao || null,
      total,
      taxa_entrega: taxaEntrega,
      forma_pagamento: input.formaPagamento,
      tipo_entrega: input.tipoEntrega,
      ...(input.tipoEntrega === "entrega"
        ? {
            cep: input.endereco.cep,
            logradouro: input.endereco.logradouro,
            numero: input.endereco.numero,
            complemento: input.endereco.complemento,
            bairro: input.endereco.bairro,
            cidade: input.endereco.cidade,
            estado: input.endereco.estado,
          }
        : {}),
    })
    .select("id")
    .single();

  if (error || !pedido) return { error: error?.message ?? "Não foi possível criar o pedido." };

  const { error: itensError } = await admin.from("pedido_itens").insert(
    itens.map((item) => ({
      pedido_id: pedido.id,
      produto_id: item.produto_id,
      combo_id: item.combo_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      opcionais_selecionados: item.opcionais_selecionados,
      observacao: item.observacao || null,
    })),
  );

  if (itensError) return { error: itensError.message };

  return { data: { id: pedido.id } };
}

export async function solicitarCancelamentoPedido(
  slug: string,
  pedidoId: string,
  motivo: string,
): Promise<ActionResult<boolean>> {
  if (!motivo.trim()) return { error: "Selecione o motivo do cancelamento." };

  const admin = createAdminClient();

  const { data: empresa } = await admin.from("empresas").select("id").eq("slug", slug).single();
  if (!empresa) return { error: "Loja não encontrada." };

  const { data: pedido } = await admin
    .from("pedidos")
    .select("etapa_link, cancelamento_solicitado")
    .eq("id", pedidoId)
    .eq("empresa_id", empresa.id)
    .single();

  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.etapa_link !== "novo") {
    return { error: "Esse pedido já está sendo preparado e não pode mais ser cancelado por aqui." };
  }
  if (pedido.cancelamento_solicitado) return { error: "Você já solicitou o cancelamento desse pedido." };

  const { error } = await admin
    .from("pedidos")
    .update({ cancelamento_solicitado: true, motivo_solicitacao_cancelamento: motivo })
    .eq("id", pedidoId)
    .eq("empresa_id", empresa.id);

  if (error) return { error: error.message };

  revalidatePath(`/loja/${slug}/pedido/${pedidoId}`);
  revalidatePath("/empresa/pedidos-online");
  return { data: true };
}
