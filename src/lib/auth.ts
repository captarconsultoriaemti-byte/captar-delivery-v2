import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  empresa_id: string | null;
  role: "admin_master" | "empresa";
  email: string;
  created_at: string;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as Profile | null;
}

export interface Empresa {
  id: string;
  nome: string;
  status: "trial" | "active" | "suspended" | "cancelled";
}

export async function getCurrentEmpresa(empresaId: string): Promise<Empresa | null> {
  const supabase = await createClient();

  const { data: empresa } = await supabase
    .from("empresas")
    .select("id, nome, status")
    .eq("id", empresaId)
    .single();

  return empresa as Empresa | null;
}
