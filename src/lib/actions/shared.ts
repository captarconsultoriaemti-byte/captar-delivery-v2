import { getCurrentProfile, type Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult<T> {
  error?: string;
  data?: T;
}

export async function requireEmpresa(): Promise<
  { profile: Profile & { empresa_id: string } } | { error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "empresa" || !profile.empresa_id) {
    return { error: "Acesso restrito ao painel da empresa." };
  }
  return { profile: profile as Profile & { empresa_id: string } };
}

// reautentica o usuario atual com a senha informada, sem exigir novos dados -
// usado para confirmar exclusoes sensiveis no painel da empresa
export async function verificarSenhaAtual(email: string, senha: string): Promise<string | null> {
  if (!senha) return "Informe sua senha para confirmar.";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) return "Senha incorreta.";
  return null;
}
