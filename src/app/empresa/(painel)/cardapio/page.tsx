import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { CardapioClient } from "./cardapio-client";

export default async function CardapioPage() {
  const status = await requireOnboardingStatus();
  if (!status.temCategoria) redirect("/empresa/categorias");

  const supabase = await createClient();

  const [
    { data: produtos },
    { data: categorias },
    { data: categoriasTodas },
    { data: grupos },
    { data: vinculos },
    { data: itensOpcionais },
    { data: vinculosCategorias },
  ] = await Promise.all([
    supabase.from("produtos").select("*").order("ordem").order("nome"),
    supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
    supabase.from("categorias").select("id, nome").order("ordem").order("nome"),
    supabase.from("grupos_opcionais").select("id, nome").order("ordem").order("nome"),
    supabase.from("produto_grupos_opcionais").select("produto_id, grupo_id"),
    supabase.from("produto_itens_opcionais").select("produto_id, nome").order("ordem"),
    supabase.from("produto_categorias").select("produto_id, categoria_id"),
  ]);

  const gruposPorProduto = new Map<string, string[]>();
  for (const vinculo of vinculos ?? []) {
    const lista = gruposPorProduto.get(vinculo.produto_id) ?? [];
    lista.push(vinculo.grupo_id);
    gruposPorProduto.set(vinculo.produto_id, lista);
  }

  const itensOpcionaisPorProduto = new Map<string, string[]>();
  for (const item of itensOpcionais ?? []) {
    const lista = itensOpcionaisPorProduto.get(item.produto_id) ?? [];
    lista.push(item.nome);
    itensOpcionaisPorProduto.set(item.produto_id, lista);
  }

  const categoriasPorProduto = new Map<string, string[]>();
  for (const vinculo of vinculosCategorias ?? []) {
    const lista = categoriasPorProduto.get(vinculo.produto_id) ?? [];
    lista.push(vinculo.categoria_id);
    categoriasPorProduto.set(vinculo.produto_id, lista);
  }

  const produtosComGrupos = (produtos ?? []).map((produto) => ({
    ...produto,
    grupo_ids: gruposPorProduto.get(produto.id) ?? [],
    itens_opcionais: itensOpcionaisPorProduto.get(produto.id) ?? [],
    categoria_ids: categoriasPorProduto.get(produto.id) ?? [],
  }));

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Cardápio</h1>
      <CardapioClient
        produtos={produtosComGrupos}
        categorias={categorias ?? []}
        categoriasTodas={categoriasTodas ?? []}
        gruposDisponiveis={grupos ?? []}
      />
    </div>
  );
}
