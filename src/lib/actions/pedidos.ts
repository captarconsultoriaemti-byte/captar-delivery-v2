"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";
import { calcularPrecoFinal } from "@/lib/utils/desconto";

export interface ItemCarrinho {
  produto_id: string | null;
  combo_id: string | null;
  quantidade: number;
  preco_unitario: number;
  opcionais_selecionados: string[];
  observacao: string;
}

export interface PagamentoDividido {
  forma: string;
  valor: number;
}

interface SalvarPedidoInput {
  clienteNome: string;
  clienteTelefone: string;
  documentoFiscal: string;
  observacoes: string;
  itens: ItemCarrinho[];
  fechar: boolean;
  formaPagamento: string;
  descontoTipo: "percentual" | "valor" | null;
  descontoValor: number;
  pagamentos: PagamentoDividido[];
}

function calcularTotal(itens: ItemCarrinho[]): number {
  return itens.reduce((total, item) => total + item.preco_unitario * item.quantidade, 0);
}

function validarDesconto(
  subtotal: number,
  descontoTipo: "percentual" | "valor" | null,
  descontoValor: number,
): string | null {
  if (!descontoTipo) return null;

  if (descontoTipo === "percentual") {
    if (!descontoValor || descontoValor <= 0 || descontoValor >= 100) {
      return "Informe um percentual de desconto entre 1 e 99.";
    }
  } else if (!descontoValor || descontoValor <= 0 || descontoValor >= subtotal) {
    return "O valor do desconto não pode ser igual ou maior que o total do pedido.";
  }

  return null;
}

function validarPagamentos(pagamentos: PagamentoDividido[], total: number): string | null {
  if (pagamentos.length === 0) return "Informe pelo menos uma forma de pagamento.";

  const soma = pagamentos.reduce((s, p) => s + p.valor, 0);
  if (Math.abs(soma - total) > 0.01) {
    return "A soma das formas de pagamento precisa ser igual ao total do pedido.";
  }

  return null;
}

interface VinculoOpcionais {
  produto_id: string;
  grupos_opcionais:
    | { opcionais: { nome: string; preco_adicional: number }[] }
    | { opcionais: { nome: string; preco_adicional: number }[] }[]
    | null;
}

// os precos vindos do cliente sao ignorados aqui e substituidos pelo preco atual
// no banco, para evitar que um pedido seja fechado com valor divergente do cardapio
async function revalidarPrecos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  itens: ItemCarrinho[],
): Promise<{ itens: ItemCarrinho[] } | { error: string }> {
  const produtoIds = itens.filter((i) => i.produto_id).map((i) => i.produto_id!);
  const comboIds = itens.filter((i) => i.combo_id).map((i) => i.combo_id!);

  const [{ data: produtos }, { data: combos }, { data: vinculos }] = await Promise.all([
    produtoIds.length
      ? supabase.from("produtos").select("id, preco").eq("empresa_id", empresaId).in("id", produtoIds)
      : Promise.resolve({ data: [] as { id: string; preco: number }[] }),
    comboIds.length
      ? supabase.from("combos").select("id, preco").eq("empresa_id", empresaId).in("id", comboIds)
      : Promise.resolve({ data: [] as { id: string; preco: number }[] }),
    produtoIds.length
      ? supabase
          .from("produto_grupos_opcionais")
          .select("produto_id, grupos_opcionais(opcionais(nome, preco_adicional))")
          .in("produto_id", produtoIds)
      : Promise.resolve({ data: [] as VinculoOpcionais[] }),
  ]);

  const precoProduto = new Map((produtos ?? []).map((p) => [p.id, p.preco]));
  const precoCombo = new Map((combos ?? []).map((c) => [c.id, c.preco]));

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

  const itensRevalidados: ItemCarrinho[] = [];
  for (const item of itens) {
    const precoBase = item.produto_id
      ? precoProduto.get(item.produto_id)
      : item.combo_id
        ? precoCombo.get(item.combo_id)
        : undefined;

    if (precoBase === undefined) {
      return { error: "Um dos itens do pedido nao foi encontrado no cardapio atual." };
    }

    const precoOpcionaisMap = item.produto_id ? opcionaisPorProduto.get(item.produto_id) : undefined;
    const precoOpcionais = item.opcionais_selecionados.reduce(
      (soma, nome) => soma + (precoOpcionaisMap?.get(nome) ?? 0),
      0,
    );

    itensRevalidados.push({ ...item, preco_unitario: precoBase + precoOpcionais });
  }

  return { itens: itensRevalidados };
}

export async function salvarPedido(
  pedidoId: string | null,
  input: SalvarPedidoInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (input.itens.length === 0) {
    return { error: "Adicione pelo menos um item ao pedido." };
  }

  if (!input.clienteNome.trim()) {
    return { error: "Informe o nome do cliente." };
  }

  const supabase = await createClient();

  const revalidacao = await revalidarPrecos(supabase, auth.profile.empresa_id, input.itens);
  if ("error" in revalidacao) return revalidacao;
  const itens = revalidacao.itens;

  const subtotal = calcularTotal(itens);

  const erroDesconto = validarDesconto(subtotal, input.descontoTipo, input.descontoValor);
  if (erroDesconto) return { error: erroDesconto };

  const total = calcularPrecoFinal(subtotal, {
    tem_desconto: Boolean(input.descontoTipo),
    desconto_tipo: input.descontoTipo,
    desconto_valor: input.descontoValor,
  });

  if (input.fechar) {
    const erroPagamentos = validarPagamentos(input.pagamentos, total);
    if (erroPagamentos) return { error: erroPagamentos };
  }

  const dadosPedido = {
    empresa_id: auth.profile.empresa_id,
    cliente_nome: input.clienteNome || null,
    cliente_telefone: input.clienteTelefone || null,
    documento_fiscal: input.documentoFiscal || null,
    observacoes: input.observacoes || null,
    total,
    desconto_tipo: input.descontoTipo,
    desconto_valor: input.descontoTipo ? input.descontoValor : null,
    status: input.fechar ? ("fechado" as const) : ("aberto" as const),
    forma_pagamento: input.fechar ? input.pagamentos.map((p) => p.forma).join(" + ") : null,
    pagamentos: input.fechar ? input.pagamentos : null,
    closed_at: input.fechar ? new Date().toISOString() : null,
  };

  let id = pedidoId;

  if (id) {
    const { error } = await supabase.from("pedidos").update(dadosPedido).eq("id", id);
    if (error) return { error: error.message };

    await supabase.from("pedido_itens").delete().eq("pedido_id", id);
  } else {
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .insert(dadosPedido)
      .select()
      .single();

    if (error || !pedido) return { error: error?.message ?? "Nao foi possivel criar o pedido." };
    id = pedido.id;
  }

  const { error: itensError } = await supabase.from("pedido_itens").insert(
    itens.map((item) => ({
      pedido_id: id,
      produto_id: item.produto_id,
      combo_id: item.combo_id,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      opcionais_selecionados: item.opcionais_selecionados,
      observacao: item.observacao || null,
    })),
  );

  if (itensError) return { error: itensError.message };

  revalidatePath("/empresa/pedidos");
  return { data: { id: id! } };
}

export async function fecharPedido(
  pedidoId: string,
  pagamentos: PagamentoDividido[],
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const { data: pedidoAtual } = await supabase
    .from("pedidos")
    .select("total")
    .eq("id", pedidoId)
    .single();

  if (!pedidoAtual) return { error: "Pedido não encontrado." };

  const erroPagamentos = validarPagamentos(pagamentos, pedidoAtual.total);
  if (erroPagamentos) return { error: erroPagamentos };

  const { error } = await supabase
    .from("pedidos")
    .update({
      status: "fechado",
      forma_pagamento: pagamentos.map((p) => p.forma).join(" + "),
      closed_at: new Date().toISOString(),
    })
    .eq("id", pedidoId);

  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos");
  return { data: true };
}

// exclusao so e permitida para pedidos ainda abertos - um pedido fechado
// ja foi cobrado e entra no financeiro, entao nao pode ser apagado
export async function deletePedido(pedidoId: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();

  const { data: pedido } = await supabase
    .from("pedidos")
    .select("status")
    .eq("id", pedidoId)
    .single();

  if (!pedido) return { error: "Pedido não encontrado." };
  if (pedido.status !== "aberto") {
    return { error: "Apenas pedidos em aberto podem ser excluídos." };
  }

  const { error } = await supabase.from("pedidos").delete().eq("id", pedidoId);
  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos");
  return { data: true };
}

// permite adicionar/alterar o cpf ou cnpj do pedido mesmo depois de fechado,
// para quando o cliente pede o comprovante so depois de ja ter pago
export async function atualizarDocumentoPedido(
  pedidoId: string,
  documento: string,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const digitos = documento.replace(/\D/g, "");
  if (digitos.length > 0 && digitos.length !== 11 && digitos.length !== 14) {
    return { error: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ documento_fiscal: documento || null })
    .eq("id", pedidoId)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/pedidos");
  return { data: true };
}
