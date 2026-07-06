import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { getCurrentProfile } from "@/lib/auth";
import { HistoricoClient, type PedidoHistorico } from "./historico-client";

export default async function HistoricoPedidosOnlinePage({
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

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, cliente_nome, cliente_telefone, total, etapa_link, created_at, closed_at, tipo_entrega, bairro, cidade, logradouro, numero, complemento, forma_pagamento, observacoes, motivo_cancelamento, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(nome), combos(nome))",
    )
    .eq("origem", "link")
    .eq("empresa_id", profile!.empresa_id)
    .in("etapa_link", ["entregue", "cancelado"])
    .gte("created_at", inicioDoDia.toISOString())
    .lte("created_at", fimDoDia.toISOString())
    .order("created_at", { ascending: false });

  function formatarDataLocal(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/empresa/pedidos-online"
          className="flex items-center gap-1 text-sm font-medium text-secondary hover:text-primary"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
        <h1 className="text-xl font-bold">Histórico — Pedidos Online</h1>
      </div>
      <HistoricoClient
        pedidos={(pedidos ?? []) as unknown as PedidoHistorico[]}
        data={dataParam ?? formatarDataLocal(new Date())}
      />
    </div>
  );
}
