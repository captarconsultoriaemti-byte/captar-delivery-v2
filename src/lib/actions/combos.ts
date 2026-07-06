"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";
import { calcularPrecoFinal } from "@/lib/utils/desconto";

interface ComboItemInput {
  produto_id: string;
  quantidade: number;
}

interface ComboInput {
  nome: string;
  descricao: string;
  ativo: boolean;
  itens: ComboItemInput[];
  temDesconto: boolean;
  descontoTipo: "percentual" | "valor";
  descontoValor: number;
  foto?: File | null;
}

function validarItens(itens: ComboItemInput[]): string | null {
  if (itens.length < 2) return "Um combo precisa de no minimo 2 produtos.";
  return null;
}

function validarDesconto(input: ComboInput): string | null {
  if (!input.temDesconto) return null;

  if (input.descontoTipo === "percentual") {
    if (!input.descontoValor || input.descontoValor <= 0 || input.descontoValor > 100) {
      return "Informe um percentual de desconto entre 1 e 100.";
    }
  } else if (!input.descontoValor || input.descontoValor <= 0) {
    return "Informe um valor de desconto maior que zero.";
  }

  return null;
}

async function uploadFotoSeExistir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  foto?: File | null,
): Promise<{ fotoUrl?: string; error?: string }> {
  if (!foto || foto.size === 0) return {};

  const extensao = foto.name.split(".").pop() ?? "jpg";
  const caminho = `${empresaId}/${Date.now()}.${extensao}`;

  const { error } = await supabase.storage.from("combos").upload(caminho, foto, {
    upsert: true,
    contentType: foto.type,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from("combos").getPublicUrl(caminho);
  return { fotoUrl: data.publicUrl };
}

// soma o preco atual dos produtos (buscado no banco, nao confia no navegador)
// e aplica o desconto, pra o preco do combo nunca ficar dessincronizado do cardapio
async function calcularPrecoCombo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  itens: ComboItemInput[],
  input: ComboInput,
): Promise<{ preco: number } | { error: string }> {
  const produtoIds = itens.map((i) => i.produto_id);

  const { data: produtos, error } = await supabase
    .from("produtos")
    .select("id, preco")
    .eq("empresa_id", empresaId)
    .in("id", produtoIds);

  if (error) return { error: error.message };

  const precoPorProduto = new Map((produtos ?? []).map((p) => [p.id, p.preco]));

  let soma = 0;
  for (const item of itens) {
    const preco = precoPorProduto.get(item.produto_id);
    if (preco === undefined) {
      return { error: "Um dos produtos do combo nao foi encontrado no cardapio atual." };
    }
    soma += preco * item.quantidade;
  }

  const precoFinal = calcularPrecoFinal(soma, {
    tem_desconto: input.temDesconto,
    desconto_tipo: input.descontoTipo,
    desconto_valor: input.descontoValor,
  });

  return { preco: precoFinal };
}

export async function createCombo(input: ComboInput): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (!input.descricao.trim()) return { error: "A descrição do combo é obrigatória." };

  const erroValidacao = validarItens(input.itens);
  if (erroValidacao) return { error: erroValidacao };

  const erroDesconto = validarDesconto(input);
  if (erroDesconto) return { error: erroDesconto };

  const supabase = await createClient();

  const resultadoPreco = await calcularPrecoCombo(
    supabase,
    auth.profile.empresa_id,
    input.itens,
    input,
  );
  if ("error" in resultadoPreco) return { error: resultadoPreco.error };

  const { fotoUrl, error: fotoError } = await uploadFotoSeExistir(
    supabase,
    auth.profile.empresa_id,
    input.foto,
  );
  if (fotoError) return { error: `Falha ao enviar a foto: ${fotoError}` };

  const { data: combo, error } = await supabase
    .from("combos")
    .insert({
      empresa_id: auth.profile.empresa_id,
      nome: input.nome,
      descricao: input.descricao,
      preco: resultadoPreco.preco,
      ativo: input.ativo,
      foto_url: fotoUrl,
      tem_desconto: input.temDesconto,
      desconto_tipo: input.temDesconto ? input.descontoTipo : null,
      desconto_valor: input.temDesconto ? input.descontoValor : null,
    })
    .select()
    .single();

  if (error || !combo) return { error: error?.message ?? "Nao foi possivel criar o combo." };

  const { error: itensError } = await supabase.from("combo_itens").insert(
    input.itens.map((item) => ({
      combo_id: combo.id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
    })),
  );

  if (itensError) {
    await supabase.from("combos").delete().eq("id", combo.id);
    return { error: itensError.message };
  }

  revalidatePath("/empresa/combos");
  return { data: true };
}

export async function updateCombo(id: string, input: ComboInput): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (!input.descricao.trim()) return { error: "A descrição do combo é obrigatória." };

  const erroValidacao = validarItens(input.itens);
  if (erroValidacao) return { error: erroValidacao };

  const erroDesconto = validarDesconto(input);
  if (erroDesconto) return { error: erroDesconto };

  const supabase = await createClient();

  const resultadoPreco = await calcularPrecoCombo(
    supabase,
    auth.profile.empresa_id,
    input.itens,
    input,
  );
  if ("error" in resultadoPreco) return { error: resultadoPreco.error };

  const { fotoUrl, error: fotoError } = await uploadFotoSeExistir(
    supabase,
    auth.profile.empresa_id,
    input.foto,
  );
  if (fotoError) return { error: `Falha ao enviar a foto: ${fotoError}` };

  const { error } = await supabase
    .from("combos")
    .update({
      nome: input.nome,
      descricao: input.descricao,
      preco: resultadoPreco.preco,
      ativo: input.ativo,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      tem_desconto: input.temDesconto,
      desconto_tipo: input.temDesconto ? input.descontoTipo : null,
      desconto_valor: input.temDesconto ? input.descontoValor : null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await supabase.from("combo_itens").delete().eq("combo_id", id);

  const { error: itensError } = await supabase.from("combo_itens").insert(
    input.itens.map((item) => ({
      combo_id: id,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
    })),
  );

  if (itensError) return { error: itensError.message };

  revalidatePath("/empresa/combos");
  return { data: true };
}

export async function deleteCombo(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase.from("combos").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/combos");
  return { data: true };
}
