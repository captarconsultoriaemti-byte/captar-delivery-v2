"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";
import { normalizarBairro } from "@/lib/utils/endereco";

export async function createBairroEntrega(
  bairro: string,
  valor: number,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (!bairro.trim()) return { error: "Informe o nome do bairro." };

  const supabase = await createClient();
  const { error } = await supabase.from("bairros_entrega").insert({
    empresa_id: auth.profile.empresa_id,
    bairro: bairro.trim(),
    bairro_normalizado: normalizarBairro(bairro),
    valor,
  });

  if (error) {
    if (error.code === "23505") return { error: "Esse bairro já está cadastrado." };
    return { error: error.message };
  }

  revalidatePath("/empresa/bairros-entrega");
  return { data: true };
}

export async function updateBairroEntrega(
  id: string,
  bairro: string,
  valor: number,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (!bairro.trim()) return { error: "Informe o nome do bairro." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("bairros_entrega")
    .update({ bairro: bairro.trim(), bairro_normalizado: normalizarBairro(bairro), valor })
    .eq("id", id)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) {
    if (error.code === "23505") return { error: "Esse bairro já está cadastrado." };
    return { error: error.message };
  }

  revalidatePath("/empresa/bairros-entrega");
  return { data: true };
}

export async function deleteBairroEntrega(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase
    .from("bairros_entrega")
    .delete()
    .eq("id", id)
    .eq("empresa_id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/bairros-entrega");
  return { data: true };
}
