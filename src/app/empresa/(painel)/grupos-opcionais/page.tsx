import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { GruposOpcionaisClient } from "./grupos-opcionais-client";

export default async function GruposOpcionaisPage() {
  const status = await requireOnboardingStatus();
  if (!status.temCategoria) redirect("/empresa/categorias");

  const supabase = await createClient();

  const [{ data: grupos }, { data: vinculos }] = await Promise.all([
    supabase
      .from("grupos_opcionais")
      .select("*, opcionais(id, nome, preco_adicional)")
      .order("ordem")
      .order("nome"),
    supabase.from("produto_grupos_opcionais").select("grupo_id, produtos(nome)"),
  ]);

  const produtosPorGrupo = new Map<string, string[]>();
  for (const vinculo of (vinculos ?? []) as unknown as {
    grupo_id: string;
    produtos: { nome: string } | { nome: string }[] | null;
  }[]) {
    const produto = Array.isArray(vinculo.produtos) ? vinculo.produtos[0] : vinculo.produtos;
    if (!produto) continue;
    const lista = produtosPorGrupo.get(vinculo.grupo_id) ?? [];
    lista.push(produto.nome);
    produtosPorGrupo.set(vinculo.grupo_id, lista);
  }

  const gruposComUso = (grupos ?? []).map((grupo) => {
    const produtosVinculados = produtosPorGrupo.get(grupo.id) ?? [];
    return {
      ...grupo,
      emUsoPor: produtosVinculados.length,
      produtosVinculados,
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Grupos de Adicionais</h1>
      <p className="mb-6 text-sm text-secondary">
        Cadastre um grupo (ex: &quot;Adicionais de Hambúrguer&quot;) e vincule aos produtos do cardápio.
      </p>
      <GruposOpcionaisClient grupos={gruposComUso} />
    </div>
  );
}
