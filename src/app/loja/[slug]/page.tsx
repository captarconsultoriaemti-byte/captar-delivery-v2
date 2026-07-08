import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizarHorarios } from "@/lib/utils/horario";
import { disponivelHoje } from "@/lib/utils/dias-semana";
import { LojaClient } from "./loja-client";

export default async function LojaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: empresa } = await admin
    .from("empresas")
    .select(
      "id, nome, logo_url, status, tempo_medio_entrega, tempo_estimado_preparo, taxa_entrega_padrao, horario_funcionamento, pausa_manual, whatsapp, cep, logradouro, numero, complemento, bairro, cidade, estado",
    )
    .eq("slug", slug)
    .single();

  if (!empresa || empresa.status === "suspended" || empresa.status === "cancelled") {
    notFound();
  }

  const [{ data: categorias }, { data: produtos }, { data: combos }, { data: bairrosEntrega }] =
    await Promise.all([
      admin
        .from("categorias")
        .select("id, nome")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .order("ordem")
        .order("nome"),
      admin
        .from("produtos")
        .select(
          "id, nome, descricao, preco, foto_url, destaque, tem_desconto, desconto_tipo, desconto_valor, dias_semana, produto_grupos_opcionais(grupos_opcionais(id, nome, ordem, obrigatorio, minimo_selecao, maximo_selecao, opcionais(id, nome, preco_adicional))), produto_itens_opcionais(id, nome, ordem, grupo_titulo), produto_categorias(categoria_id)",
        )
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .order("ordem")
        .order("nome"),
      admin
        .from("combos")
        .select("id, nome, descricao, preco, foto_url, tem_desconto, desconto_tipo, desconto_valor")
        .eq("empresa_id", empresa.id)
        .eq("ativo", true)
        .order("nome"),
      admin.from("bairros_entrega").select("bairro_normalizado, valor").eq("empresa_id", empresa.id),
    ]);

  const produtosComGrupos = (produtos ?? [])
    .filter((produto) => disponivelHoje(produto.dias_semana))
    .map((produto) => {
      const grupos = (produto.produto_grupos_opcionais ?? [])
        .map((v: { grupos_opcionais: unknown }) => v.grupos_opcionais)
        .filter(
          (g): g is { ordem: number; [key: string]: unknown } => Boolean(g) && !Array.isArray(g),
        );

      grupos.sort((a, b) => (a.ordem as number) - (b.ordem as number));

      const itensOpcionais = [...(produto.produto_itens_opcionais ?? [])].sort(
        (a, b) => a.ordem - b.ordem,
      );

      const categoriaIds = (produto.produto_categorias ?? []).map(
        (v: { categoria_id: string }) => v.categoria_id,
      );

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        produto_grupos_opcionais: _omit,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        produto_itens_opcionais: _omit2,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        produto_categorias: _omit3,
        ...resto
      } = produto;
      return { ...resto, grupos, itens_opcionais: itensOpcionais, categoria_ids: categoriaIds };
    });

  return (
    <LojaClient
      slug={slug}
      empresa={{
        nome: empresa.nome,
        logoUrl: empresa.logo_url,
        tempoMedioEntrega: empresa.tempo_medio_entrega,
        tempoEstimadoPreparo: empresa.tempo_estimado_preparo,
        taxaEntregaPadrao: empresa.taxa_entrega_padrao,
        horarioFuncionamento: normalizarHorarios(empresa.horario_funcionamento ?? []),
        pausaManual: empresa.pausa_manual,
        whatsapp: empresa.whatsapp,
        cep: empresa.cep,
        logradouro: empresa.logradouro,
        numero: empresa.numero,
        complemento: empresa.complemento,
        bairro: empresa.bairro,
        cidade: empresa.cidade,
        estado: empresa.estado,
      }}
      categorias={categorias ?? []}
      produtos={produtosComGrupos as never}
      combos={combos ?? []}
      bairrosEntrega={bairrosEntrega ?? []}
    />
  );
}
