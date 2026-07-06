"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";

export async function createCategoria(nome: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").insert({
    empresa_id: auth.profile.empresa_id,
    nome,
  });

  if (error) return { error: error.message };

  revalidatePath("/empresa/categorias");
  return { data: true };
}

export async function updateCategoria(
  id: string,
  nome: string,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("categorias").update({ nome }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/categorias");
  return { data: true };
}

export async function updateCategoriaStatus(
  id: string,
  ativo: boolean,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  // desativar uma categoria com produtos e permitido de proposito: e assim
  // que a empresa troca de cardapio (ex: almoco/janta) sem duplicar cadastro
  const { error } = await supabase.from("categorias").update({ ativo }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/categorias");
  return { data: true };
}

export async function updateCategoriasOrdem(ids: string[]): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const resultados = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("categorias")
        .update({ ordem: index })
        .eq("id", id)
        .eq("empresa_id", auth.profile.empresa_id),
    ),
  );

  const erro = resultados.find((r) => r.error);
  if (erro?.error) return { error: erro.error.message };

  revalidatePath("/empresa/categorias");
  return { data: true };
}

export async function deleteCategoria(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();

  const { count } = await supabase
    .from("produto_categorias")
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);

  if (count && count > 0) {
    return {
      error: `Essa categoria tem ${count} produto(s) no cardápio e não pode ser excluída.`,
    };
  }

  const { error } = await supabase.from("categorias").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/categorias");
  return { data: true };
}
