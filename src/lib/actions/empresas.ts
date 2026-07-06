"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { slugify } from "@/lib/utils/slug";

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

function empresaColumnsFromFormData(formData: FormData) {
  const slugBruto = String(formData.get("slug") ?? "");

  return {
    nome: String(formData.get("nome") ?? ""),
    email: String(formData.get("email") ?? ""),
    slug: slugBruto ? slugify(slugBruto) : null,
    tipo_estabelecimento_id: String(formData.get("tipoEstabelecimentoId") ?? ""),
    cnpj: String(formData.get("cnpj") ?? ""),
    nome_responsavel: String(formData.get("nomeResponsavel") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    cep: String(formData.get("cep") ?? ""),
    logradouro: String(formData.get("logradouro") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    complemento: String(formData.get("complemento") ?? ""),
    bairro: String(formData.get("bairro") ?? ""),
    cidade: String(formData.get("cidade") ?? ""),
    estado: String(formData.get("estado") ?? ""),
  };
}

function erroSlugDuplicado(error: { code?: string } | null): string | null {
  if (error?.code === "23505") {
    return "Esse endereço de link já está em uso por outra empresa. Escolha outro.";
  }
  return null;
}

async function uploadLogoSeExistir(
  admin: ReturnType<typeof createAdminClient>,
  empresaId: string,
  formData: FormData,
): Promise<{ logoUrl?: string; error?: string }> {
  const logo = formData.get("logo");
  if (!(logo instanceof File) || logo.size === 0) return {};

  const extensao = logo.name.split(".").pop() ?? "png";
  const caminho = `${empresaId}/logo.${extensao}`;

  const { error } = await admin.storage.from("logos-empresas").upload(caminho, logo, {
    upsert: true,
    contentType: logo.type,
  });

  if (error) return { error: error.message };

  const { data } = admin.storage.from("logos-empresas").getPublicUrl(caminho);
  return { logoUrl: data.publicUrl };
}

export async function createEmpresa(formData: FormData): Promise<ActionResult<Record<string, unknown>>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const senha = String(formData.get("senha") ?? "");
  const dados = empresaColumnsFromFormData(formData);

  const admin = createAdminClient();

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: dados.email,
    password: senha,
    email_confirm: true,
  });

  if (userError || !userData.user) {
    return { error: userError?.message ?? "Nao foi possivel criar o usuario." };
  }

  const supabase = await createClient();

  const { logoUrl, error: logoError } = await uploadLogoSeExistir(
    admin,
    userData.user.id,
    formData,
  );

  if (logoError) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userData.user.id);
    return {
      error: deleteUserError
        ? `Falha ao enviar a logo e a limpeza automatica tambem falhou (usuario ${dados.email} pode ter ficado orfao). Erro: ${logoError}`
        : `Falha ao enviar a logo: ${logoError}`,
    };
  }

  const { data: empresa, error: empresaError } = await supabase
    .from("empresas")
    .insert({ ...dados, logo_url: logoUrl })
    .select()
    .single();

  if (empresaError || !empresa) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userData.user.id);

    if (deleteUserError) {
      return {
        error:
          "Falha ao criar a empresa e a limpeza automatica do usuario tambem falhou. " +
          `Verifique manualmente no Supabase se sobrou um usuario orfao para o e-mail ${dados.email}.`,
      };
    }

    return {
      error:
        erroSlugDuplicado(empresaError) ??
        empresaError?.message ??
        "Nao foi possivel criar a empresa.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userData.user.id,
    empresa_id: empresa.id,
    role: "empresa",
    email: dados.email,
  });

  if (profileError) {
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userData.user.id);
    const { error: deleteEmpresaError } = await supabase
      .from("empresas")
      .delete()
      .eq("id", empresa.id);

    if (deleteUserError || deleteEmpresaError) {
      return {
        error:
          "Falha ao criar o perfil da empresa e a limpeza automatica tambem falhou. " +
          "Verifique manualmente no Supabase se sobrou um usuario ou empresa orfao " +
          `para o e-mail ${dados.email} antes de tentar cadastrar novamente.`,
      };
    }

    return { error: profileError.message };
  }

  revalidatePath("/admin/empresas");
  return { data: empresa };
}

export async function updateEmpresa(
  empresaId: string,
  formData: FormData,
): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const dados = empresaColumnsFromFormData(formData);
  const admin = createAdminClient();
  const supabase = await createClient();

  const { logoUrl, error: logoError } = await uploadLogoSeExistir(admin, empresaId, formData);
  if (logoError) return { error: `Falha ao enviar a logo: ${logoError}` };

  // e-mail nao e editavel aqui: esta atrelado ao usuario de login (auth.users) da empresa
  const {
    nome,
    slug,
    tipo_estabelecimento_id,
    cnpj,
    nome_responsavel,
    whatsapp,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
  } = dados;

  const { error } = await supabase
    .from("empresas")
    .update({
      nome,
      slug,
      tipo_estabelecimento_id,
      cnpj,
      nome_responsavel,
      whatsapp,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", empresaId);

  if (error) return { error: erroSlugDuplicado(error) ?? error.message };

  revalidatePath("/admin/empresas");
  return { data: true };
}

export async function updateEmpresaStatus(
  empresaId: string,
  status: "trial" | "active" | "suspended" | "cancelled",
): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const supabase = await createClient();

  const { error } = await supabase.from("empresas").update({ status }).eq("id", empresaId);

  if (error) return { error: error.message };

  revalidatePath("/admin/empresas");
  return { data: true };
}

export async function extendTrial(empresaId: string, days = 30): Promise<ActionResult<boolean>> {
  const accessError = await requireAdminMaster();
  if (accessError) return accessError;

  const supabase = await createClient();

  const novaData = new Date();
  novaData.setDate(novaData.getDate() + days);

  const { error } = await supabase
    .from("empresas")
    .update({ trial_ends_at: novaData.toISOString(), status: "trial" })
    .eq("id", empresaId);

  if (error) return { error: error.message };

  revalidatePath("/admin/empresas");
  return { data: true };
}
