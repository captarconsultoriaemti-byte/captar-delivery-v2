import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { disponivelHoje } from "@/lib/utils/dias-semana";
import { NovoPedidoClient } from "./novo-pedido-client";

export default async function NovoPedidoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const { id } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user!.id)
    .single();

  const [
    { data: produtos },
    { data: categorias },
    { data: combos },
    { data: empresa },
    { data: clientes },
    pedidoExistente,
  ] = await Promise.all([
      supabase
        .from("produtos")
        .select(
          "*, produto_grupos_opcionais(grupos_opcionais(id, nome, ordem, obrigatorio, minimo_selecao, maximo_selecao, opcionais(id, nome, preco_adicional))), produto_itens_opcionais(id, nome, ordem), produto_categorias(categoria_id)",
        )
        .eq("ativo", true)
        .order("ordem")
        .order("nome"),
      supabase.from("categorias").select("id, nome").eq("ativo", true).order("ordem").order("nome"),
      supabase.from("combos").select("*").eq("ativo", true).order("nome"),
      supabase
        .from("empresas")
        .select("opcionais_habilitados, nome, mensagem_agradecimento, impressao_automatica, impressora_automatica")
        .eq("id", profile!.empresa_id)
        .single(),
      supabase.from("clientes").select("id, nome, whatsapp, cpf").eq("ativo", true).order("nome"),
      id
        ? supabase
            .from("pedidos")
            .select("*, pedido_itens(*)")
            .eq("id", id)
            .single()
            .then((r) => r.data)
        : Promise.resolve(null),
    ]);

  const produtosComGrupos = (produtos ?? [])
    .filter((produto) => disponivelHoje(produto.dias_semana))
    .map((produto) => {
      const grupos: { ordem: number }[] = (produto.produto_grupos_opcionais ?? [])
        .map((v: { grupos_opcionais: { ordem: number } | null }) => v.grupos_opcionais)
        .filter((g: { ordem: number } | null): g is { ordem: number } => Boolean(g));

      grupos.sort((a, b) => a.ordem - b.ordem);

      const itensOpcionais = [...(produto.produto_itens_opcionais ?? [])].sort(
        (a, b) => a.ordem - b.ordem,
      );

      const categoriaIds = (produto.produto_categorias ?? []).map(
        (v: { categoria_id: string }) => v.categoria_id,
      );

      return { ...produto, grupos, itens_opcionais: itensOpcionais, categoria_ids: categoriaIds };
    });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">
        {pedidoExistente ? "Editar Pedido" : "Novo Pedido"}
      </h1>
      <NovoPedidoClient
        produtos={produtosComGrupos}
        categorias={categorias ?? []}
        combos={combos ?? []}
        clientes={clientes ?? []}
        opcionaisHabilitados={empresa?.opcionais_habilitados ?? true}
        pedidoExistente={pedidoExistente}
        empresa={{
          nome: empresa?.nome ?? "",
          mensagem_agradecimento: empresa?.mensagem_agradecimento ?? null,
        }}
        impressaoAutomatica={empresa?.impressao_automatica ?? false}
        impressoraAutomatica={empresa?.impressora_automatica ?? null}
      />
    </div>
  );
}
