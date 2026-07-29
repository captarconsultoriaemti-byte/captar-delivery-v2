import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { getCurrentProfile } from "@/lib/auth";
import { PedidosClient } from "./pedidos-client";

function formatarDataLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ dataInicio?: string; dataFim?: string }>;
}) {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const { dataInicio: dataInicioParam, dataFim: dataFimParam } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // sem nenhum dos dois preenchidos, mantem o comportamento de sempre:
  // mostra so o dia de hoje ("Lista do Dia"), em vez de todo o historico
  const hoje = formatarDataLocal(new Date());
  const temFiltroData = Boolean(dataInicioParam || dataFimParam);
  const dataInicio = dataInicioParam ?? (temFiltroData ? undefined : hoje);
  const dataFim = dataFimParam ?? (temFiltroData ? undefined : hoje);

  let queryPedidos = supabase
    .from("pedidos")
    .select(
      "*, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(id, nome), combos(nome))",
    )
    .eq("origem", "balcao");

  // filtra por data_pedido; pedidos sem data_pedido preenchida (anteriores a
  // essa coluna existir, ou de outras origens) caem no fallback por created_at,
  // pra nao sumirem do historico
  if (dataInicio) {
    const inicioDoDia = new Date(`${dataInicio}T00:00:00`).toISOString();
    queryPedidos = queryPedidos.or(
      `data_pedido.gte.${dataInicio},and(data_pedido.is.null,created_at.gte.${inicioDoDia})`,
    );
  }
  if (dataFim) {
    const fimDoDia = new Date(`${dataFim}T23:59:59.999`).toISOString();
    queryPedidos = queryPedidos.or(
      `data_pedido.lte.${dataFim},and(data_pedido.is.null,created_at.lte.${fimDoDia})`,
    );
  }

  const [{ data: pedidos }, { data: empresa }] = await Promise.all([
    queryPedidos.order("created_at", { ascending: false }),
    supabase
      .from("empresas")
      .select(
        "nome, mensagem_agradecimento, impressao_automatica, impressora_automatica, cnpj, cep, logradouro, numero, bairro, cidade, estado",
      )
      .eq("id", profile!.empresa_id)
      .single(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Lista do Dia</h1>
      <PedidosClient
        pedidos={pedidos ?? []}
        empresa={{
          nome: empresa?.nome ?? "",
          mensagem_agradecimento: empresa?.mensagem_agradecimento ?? null,
          cnpj: empresa?.cnpj ?? null,
          cep: empresa?.cep ?? null,
          logradouro: empresa?.logradouro ?? null,
          numero: empresa?.numero ?? null,
          bairro: empresa?.bairro ?? null,
          cidade: empresa?.cidade ?? null,
          estado: empresa?.estado ?? null,
        }}
        impressaoAutomatica={empresa?.impressao_automatica ?? false}
        impressoraAutomatica={empresa?.impressora_automatica ?? null}
        dataInicio={dataInicioParam ?? (temFiltroData ? "" : hoje)}
        dataFim={dataFimParam ?? (temFiltroData ? "" : hoje)}
      />
    </div>
  );
}
