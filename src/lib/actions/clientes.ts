"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, verificarSenhaAtual, type ActionResult } from "@/lib/actions/shared";

function clienteColunasFromFormData(formData: FormData) {
  return {
    nome: String(formData.get("nome") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cpf: String(formData.get("cpf") ?? "") || null,
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    estado: String(formData.get("estado") ?? ""),
    observacoes: String(formData.get("observacoes") ?? ""),
  };
}

export interface ClienteCriado {
  id: string;
  nome: string;
  whatsapp: string | null;
  cpf: string | null;
}

export async function createCliente(formData: FormData): Promise<ActionResult<ClienteCriado>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const dados = clienteColunasFromFormData(formData);
  if (!dados.nome.trim()) return { error: "O nome do cliente é obrigatório." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      empresa_id: auth.profile.empresa_id,
      ...dados,
    })
    .select("id, nome, whatsapp, cpf")
    .single();

  if (error || !data) return { error: error?.message ?? "Nao foi possivel cadastrar o cliente." };

  revalidatePath("/empresa/clientes");
  return { data };
}

export async function updateCliente(
  id: string,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const dados = clienteColunasFromFormData(formData);
  if (!dados.nome.trim()) return { error: "O nome do cliente é obrigatório." };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(dados).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/clientes");
  return { data: true };
}

export async function updateClienteStatus(
  id: string,
  ativo: boolean,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update({ ativo }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/clientes");
  return { data: true };
}

export async function deleteCliente(id: string, senha: string): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroSenha = await verificarSenhaAtual(auth.profile.email, senha);
  if (erroSenha) return { error: erroSenha };

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/clientes");
  return { data: true };
}
