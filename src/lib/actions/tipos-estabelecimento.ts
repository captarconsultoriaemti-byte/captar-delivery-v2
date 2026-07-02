"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

interface ActionResult<T> {
  error?: string;
  data?: T;
}

async function requireAdminMaster(): Promise<ActionResult<never> | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin_master") {
    return { error: "Acesso restrito ao Admin Master." };
  }
  return null;
}

export async function createTipoEstabelecimento(nome: string): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const supabase = await createClient();
  const { error } = await supabase.from("tipos_estabelecimento").insert({ nome });

  if (error) {
    return {
      error: error.code === "23505" ? "Ja existe um tipo com esse nome." : error.message,
    };
  }

  revalidatePath("/admin/tipos-estabelecimento");
  return { data: true };
}

export async function updateTipoEstabelecimento(
  id: string,
  nome: string,
): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const supabase = await createClient();

  const { count } = await supabase
    .from("empresas")
    .select("id", { count: "exact", head: true })
    .eq("tipo_estabelecimento_id", id);

  if (count && count > 0) {
    return {
      error: `Esse tipo esta em uso por ${count} empresa(s) e nao pode ser editado.`,
    };
  }

  const { error } = await supabase
    .from("tipos_estabelecimento")
    .update({ nome })
    .eq("id", id);

  if (error) {
    return {
      error: error.code === "23505" ? "Ja existe um tipo com esse nome." : error.message,
    };
  }

  revalidatePath("/admin/tipos-estabelecimento");
  return { data: true };
}

export async function deleteTipoEstabelecimento(id: string): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const supabase = await createClient();

  const { count } = await supabase
    .from("empresas")
    .select("id", { count: "exact", head: true })
    .eq("tipo_estabelecimento_id", id);

  if (count && count > 0) {
    return {
      error: `Esse tipo esta em uso por ${count} empresa(s) e nao pode ser excluido.`,
    };
  }

  const { error } = await supabase.from("tipos_estabelecimento").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/tipos-estabelecimento");
  return { data: true };
}
