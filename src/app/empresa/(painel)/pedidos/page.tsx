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
  searchParams: Promise<{ data?: string }>;
}) {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const { data: dataParam } = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const dataSelecionada = dataParam ? new Date(`${dataParam}T00:00:00`) : new Date();
  const inicioDoDia = new Date(dataSelecionada);
  inicioDoDia.setHours(0, 0, 0, 0);
  const fimDoDia = new Date(dataSelecionada);
  fimDoDia.setHours(23, 59, 59, 999);

  const [{ data: pedidos }, { data: empresa }] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "*, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(nome), combos(nome))",
      )
      .eq("origem", "balcao")
      .gte("created_at", inicioDoDia.toISOString())
      .lte("created_at", fimDoDia.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("empresas")
      .select("nome, mensagem_agradecimento, impressao_automatica, impressora_automatica")
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
        }}
        impressaoAutomatica={empresa?.impressao_automatica ?? false}
        impressoraAutomatica={empresa?.impressora_automatica ?? null}
        data={dataParam ?? formatarDataLocal(new Date())}
      />
    </div>
  );
}
