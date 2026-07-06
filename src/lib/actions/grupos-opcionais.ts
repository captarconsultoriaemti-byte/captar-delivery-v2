"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";

interface OpcionalItemInput {
  nome: string;
  preco_adicional: number;
}

interface GrupoOpcionalInput {
  nome: string;
  obrigatorio: boolean;
  minimoSelecao: number;
  maximoSelecao: number;
  itens: OpcionalItemInput[];
}

function validarMinimoObrigatorio(input: GrupoOpcionalInput): string | null {
  if (input.obrigatorio && input.minimoSelecao < 1) {
    return "Um grupo obrigatório precisa de no mínimo 1 escolha.";
  }
  return null;
}

async function salvarItens(
  supabase: Awaited<ReturnType<typeof createClient>>,
  grupoId: string,
  itens: OpcionalItemInput[],
) {
  await supabase.from("opcionais").delete().eq("grupo_id", grupoId);

  if (itens.length === 0) return null;

  const { error } = await supabase.from("opcionais").insert(
    itens.map((item) => ({
      grupo_id: grupoId,
      nome: item.nome,
      preco_adicional: item.preco_adicional,
    })),
  );

  return error;
}

export async function createGrupoOpcional(
  input: GrupoOpcionalInput,
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (input.itens.length === 0) {
    return { error: "Adicione pelo menos um item ao grupo." };
  }

  const erroMinimo = validarMinimoObrigatorio(input);
  if (erroMinimo) return { error: erroMinimo };

  const supabase = await createClient();

  const { data: grupo, error } = await supabase
    .from("grupos_opcionais")
    .insert({
      empresa_id: auth.profile.empresa_id,
      nome: input.nome,
      obrigatorio: input.obrigatorio,
      minimo_selecao: input.minimoSelecao,
      maximo_selecao: input.maximoSelecao,
    })
    .select()
    .single();

  if (error || !grupo) return { error: error?.message ?? "Nao foi possivel criar o grupo." };

  const itensError = await salvarItens(supabase, grupo.id, input.itens);
  if (itensError) return { error: itensError.message };

  revalidatePath("/empresa/grupos-opcionais");
  return { data: { id: grupo.id } };
}

export async function updateGrupoOpcional(
  id: string,
  input: GrupoOpcionalInput,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (input.itens.length === 0) {
    return { error: "Adicione pelo menos um item ao grupo." };
  }

  const erroMinimo = validarMinimoObrigatorio(input);
  if (erroMinimo) return { error: erroMinimo };

  const supabase = await createClient();

  const { error } = await supabase
    .from("grupos_opcionais")
    .update({
      nome: input.nome,
      obrigatorio: input.obrigatorio,
      minimo_selecao: input.minimoSelecao,
      maximo_selecao: input.maximoSelecao,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const itensError = await salvarItens(supabase, id, input.itens);
  if (itensError) return { error: itensError.message };

  revalidatePath("/empresa/grupos-opcionais");
  return { data: true };
}

export async function updateGruposOpcionaisOrdem(ids: string[]): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const resultados = await Promise.all(
    ids.map((id, index) =>
      supabase
        .from("grupos_opcionais")
        .update({ ordem: index })
        .eq("id", id)
        .eq("empresa_id", auth.profile.empresa_id),
    ),
  );

  const erro = resultados.find((r) => r.error);
  if (erro?.error) return { error: erro.error.message };

  revalidatePath("/empresa/grupos-opcionais");
  return { data: true };
}

export async function deleteGrupoOpcional(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();

  const { count } = await supabase
    .from("produto_grupos_opcionais")
    .select("id", { count: "exact", head: true })
    .eq("grupo_id", id);

  if (count && count > 0) {
    return {
      error: `Esse grupo esta vinculado a ${count} produto(s) e nao pode ser excluido.`,
    };
  }

  const { error } = await supabase.from("grupos_opcionais").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/grupos-opcionais");
  return { data: true };
}
