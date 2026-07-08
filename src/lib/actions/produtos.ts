"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";

function parseGrupoIds(formData: FormData): string[] {
  const raw = formData.get("grupoIds");
  if (!raw) return [];
  try {
    return JSON.parse(String(raw));
  } catch {
    return [];
  }
}

function parseCategoriaIds(formData: FormData): string[] {
  const raw = formData.get("categoriaIds");
  if (!raw) return [];
  try {
    return JSON.parse(String(raw));
  } catch {
    return [];
  }
}

function parseDiasSemana(formData: FormData): number[] {
  const raw = formData.get("diasSemana");
  if (!raw) return [];
  try {
    const lista = JSON.parse(String(raw));
    return Array.isArray(lista) ? lista.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [];
  } catch {
    return [];
  }
}

interface ItemOpcionalInput {
  nome: string;
  grupoTitulo: string | null;
}

function parseItensOpcionais(formData: FormData): ItemOpcionalInput[] {
  const raw = formData.get("itensOpcionais");
  if (!raw) return [];
  try {
    const lista = JSON.parse(String(raw));
    if (!Array.isArray(lista)) return [];
    return lista
      .filter((item) => item && typeof item.nome === "string" && item.nome.trim())
      .map((item) => ({
        nome: String(item.nome).trim(),
        grupoTitulo:
          typeof item.grupoTitulo === "string" && item.grupoTitulo.trim()
            ? item.grupoTitulo.trim()
            : null,
      }));
  } catch {
    return [];
  }
}

function parseEstoqueMaximo(formData: FormData): number | null {
  const raw = formData.get("estoqueMaximo");
  if (!raw || String(raw).trim() === "") return null;
  const numero = Number(raw);
  return Number.isFinite(numero) ? numero : null;
}

function produtoColumnsFromFormData(formData: FormData) {
  const temDesconto = formData.get("temDesconto") === "true";

  return {
    nome: String(formData.get("nome") ?? ""),
    descricao: String(formData.get("descricao") ?? "") || null,
    preco: Number(formData.get("preco") ?? 0),
    ativo: formData.get("ativo") === "true",
    destaque: formData.get("destaque") === "true",
    tem_desconto: temDesconto,
    dias_semana: parseDiasSemana(formData),
    desconto_tipo: temDesconto ? String(formData.get("descontoTipo") ?? "percentual") : null,
    desconto_valor: temDesconto ? Number(formData.get("descontoValor") ?? 0) : null,
    estoque_maximo: parseEstoqueMaximo(formData),
  };
}

async function uploadFotoSeExistir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  empresaId: string,
  formData: FormData,
): Promise<{ fotoUrl?: string; error?: string }> {
  const foto = formData.get("foto");
  if (!(foto instanceof File) || foto.size === 0) return {};

  const extensao = foto.name.split(".").pop() ?? "jpg";
  const caminho = `${empresaId}/${Date.now()}.${extensao}`;

  const { error } = await supabase.storage.from("produtos").upload(caminho, foto, {
    upsert: true,
    contentType: foto.type,
  });

  if (error) return { error: error.message };

  const { data } = supabase.storage.from("produtos").getPublicUrl(caminho);
  return { fotoUrl: data.publicUrl };
}

async function vincularGrupos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  grupoIds: string[],
) {
  await supabase.from("produto_grupos_opcionais").delete().eq("produto_id", produtoId);

  if (grupoIds.length === 0) return null;

  const { error } = await supabase.from("produto_grupos_opcionais").insert(
    grupoIds.map((grupoId) => ({ produto_id: produtoId, grupo_id: grupoId })),
  );

  return error;
}

async function vincularCategorias(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  categoriaIds: string[],
) {
  await supabase.from("produto_categorias").delete().eq("produto_id", produtoId);

  if (categoriaIds.length === 0) return null;

  const { error } = await supabase.from("produto_categorias").insert(
    categoriaIds.map((categoriaId) => ({ produto_id: produtoId, categoria_id: categoriaId })),
  );

  return error;
}

async function salvarItensOpcionais(
  supabase: Awaited<ReturnType<typeof createClient>>,
  produtoId: string,
  itens: ItemOpcionalInput[],
) {
  await supabase.from("produto_itens_opcionais").delete().eq("produto_id", produtoId);

  if (itens.length === 0) return null;

  const { error } = await supabase.from("produto_itens_opcionais").insert(
    itens.map((item, index) => ({
      produto_id: produtoId,
      nome: item.nome,
      grupo_titulo: item.grupoTitulo,
      ordem: index,
    })),
  );

  return error;
}

function validarDesconto(dados: ReturnType<typeof produtoColumnsFromFormData>): string | null {
  if (!dados.tem_desconto) return null;

  if (dados.desconto_tipo === "percentual") {
    if (!dados.desconto_valor || dados.desconto_valor <= 0 || dados.desconto_valor >= 100) {
      return "Informe um percentual de desconto entre 1 e 99.";
    }
  } else {
    if (!dados.desconto_valor || dados.desconto_valor <= 0) {
      return "Informe um valor de desconto maior que zero.";
    }
    if (dados.desconto_valor >= dados.preco) {
      return "O valor do desconto não pode ser igual ou maior que o preço do produto.";
    }
  }

  return null;
}

function validarEstoqueMaximo(dados: ReturnType<typeof produtoColumnsFromFormData>): string | null {
  if (dados.estoque_maximo !== null && dados.estoque_maximo < 0) {
    return "O estoque máximo não pode ser negativo.";
  }
  return null;
}

export async function createProduto(formData: FormData): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const dados = produtoColumnsFromFormData(formData);
  if (!dados.descricao) return { error: "A descrição do produto é obrigatória." };

  const erroDesconto = validarDesconto(dados);
  if (erroDesconto) return { error: erroDesconto };

  const erroEstoque = validarEstoqueMaximo(dados);
  if (erroEstoque) return { error: erroEstoque };

  const supabase = await createClient();
  const grupoIds = parseGrupoIds(formData);
  const itensOpcionais = parseItensOpcionais(formData);
  const categoriaIds = parseCategoriaIds(formData);

  const { fotoUrl, error: fotoError } = await uploadFotoSeExistir(
    supabase,
    auth.profile.empresa_id,
    formData,
  );
  if (fotoError) return { error: `Falha ao enviar a foto: ${fotoError}` };

  const { data: produto, error } = await supabase
    .from("produtos")
    .insert({
      ...dados,
      empresa_id: auth.profile.empresa_id,
      foto_url: fotoUrl,
      tem_opcionais: grupoIds.length > 0,
    })
    .select()
    .single();

  if (error || !produto) return { error: error?.message ?? "Nao foi possivel criar o produto." };

  const grupoError = await vincularGrupos(supabase, produto.id, grupoIds);
  if (grupoError) return { error: grupoError.message };

  const itensOpcionaisError = await salvarItensOpcionais(supabase, produto.id, itensOpcionais);
  if (itensOpcionaisError) return { error: itensOpcionaisError.message };

  const categoriaError = await vincularCategorias(supabase, produto.id, categoriaIds);
  if (categoriaError) return { error: categoriaError.message };

  revalidatePath("/empresa/cardapio");
  return { data: true };
}

export async function updateProduto(
  id: string,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const dados = produtoColumnsFromFormData(formData);
  if (!dados.descricao) return { error: "A descrição do produto é obrigatória." };

  const erroDesconto = validarDesconto(dados);
  if (erroDesconto) return { error: erroDesconto };

  const erroEstoque = validarEstoqueMaximo(dados);
  if (erroEstoque) return { error: erroEstoque };

  const supabase = await createClient();
  const grupoIds = parseGrupoIds(formData);
  const itensOpcionais = parseItensOpcionais(formData);
  const categoriaIds = parseCategoriaIds(formData);

  const { fotoUrl, error: fotoError } = await uploadFotoSeExistir(
    supabase,
    auth.profile.empresa_id,
    formData,
  );
  if (fotoError) return { error: `Falha ao enviar a foto: ${fotoError}` };

  const { error } = await supabase
    .from("produtos")
    .update({
      ...dados,
      ...(fotoUrl ? { foto_url: fotoUrl } : {}),
      tem_opcionais: grupoIds.length > 0,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const grupoError = await vincularGrupos(supabase, id, grupoIds);
  if (grupoError) return { error: grupoError.message };

  const itensOpcionaisError = await salvarItensOpcionais(supabase, id, itensOpcionais);
  if (itensOpcionaisError) return { error: itensOpcionaisError.message };

  const categoriaError = await vincularCategorias(supabase, id, categoriaIds);
  if (categoriaError) return { error: categoriaError.message };

  revalidatePath("/empresa/cardapio");
  return { data: true };
}

export async function updateProdutosOrdem(ids: string[]): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const resultados = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("produtos")
        .update({ ordem: index })
        .eq("id", id)
        .eq("empresa_id", auth.profile.empresa_id),
    ),
  );

  const erro = resultados.find((r) => r.error);
  if (erro?.error) return { error: erro.error.message };

  revalidatePath("/empresa/cardapio");
  return { data: true };
}

export async function deleteProduto(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();

  const { count } = await supabase
    .from("combo_itens")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", id);

  if (count && count > 0) {
    return {
      error: `Esse produto esta em ${count} combo(s) e nao pode ser excluido. Remova-o dos combos primeiro.`,
    };
  }

  const { count: countPedidos } = await supabase
    .from("pedido_itens")
    .select("id", { count: "exact", head: true })
    .eq("produto_id", id);

  if (countPedidos && countPedidos > 0) {
    return {
      error:
        "Esse produto ja foi vendido em pedidos anteriores e nao pode ser excluido, para preservar o historico. Desative-o em vez de excluir.",
    };
  }

  const { error } = await supabase.from("produtos").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/cardapio");
  return { data: true };
}
