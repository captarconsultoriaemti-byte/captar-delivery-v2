import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export interface OnboardingStatus {
  totalCategorias: number;
  totalProdutos: number;
  temCategoria: boolean;
  temProduto: boolean;
  temDoisProdutos: boolean;
  completo: boolean;
}

export async function getOnboardingStatus(empresaId: string): Promise<OnboardingStatus> {
  const supabase = await createClient();

  const [{ count: totalCategorias }, { count: totalProdutos }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId),
    supabase
      .from("produtos")
      .select("id", { count: "exact", head: true })
      .eq("empresa_id", empresaId),
  ]);

  const categorias = totalCategorias ?? 0;
  const produtos = totalProdutos ?? 0;

  return {
    totalCategorias: categorias,
    totalProdutos: produtos,
    temCategoria: categorias >= 1,
    temProduto: produtos >= 1,
    temDoisProdutos: produtos >= 2,
    completo: categorias >= 1 && produtos >= 1,
  };
}

// busca o empresa_id da sessao atual e ja retorna o status de onboarding;
// redireciona para o login se a sessao nao for de uma empresa valida
export async function requireOnboardingStatus(): Promise<OnboardingStatus> {
  const profile = await getCurrentProfile();
  if (!profile?.empresa_id) {
    redirect("/empresa/login");
  }
  return getOnboardingStatus(profile.empresa_id);
}
