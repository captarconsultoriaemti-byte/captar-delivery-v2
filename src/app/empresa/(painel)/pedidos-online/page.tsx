import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { getCurrentProfile } from "@/lib/auth";
import { PedidosOnlineClient, type Pedido } from "./pedidos-online-client";

export default async function PedidosOnlinePage() {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const [{ data: pedidos }, { data: empresa }] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, cliente_nome, cliente_telefone, total, etapa_link, created_at, tipo_entrega, bairro, cidade, logradouro, numero, complemento, forma_pagamento, observacoes, cancelamento_solicitado, motivo_solicitacao_cancelamento, pedido_itens(id, quantidade, preco_unitario, opcionais_selecionados, observacao, produtos(nome), combos(nome))",
      )
      .eq("origem", "link")
      .not("etapa_link", "in", "(entregue,cancelado)")
      .order("created_at", { ascending: true }),
    supabase
      .from("empresas")
      .select("nome, mensagem_agradecimento, impressao_automatica, impressora_automatica")
      .eq("id", profile!.empresa_id)
      .single(),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Pedidos Online</h1>
        <Link
          href="/empresa/pedidos-online/historico"
          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <History size={16} />
          Histórico
        </Link>
      </div>
      <PedidosOnlineClient
        pedidos={(pedidos ?? []) as unknown as Pedido[]}
        empresaId={profile!.empresa_id!}
        empresaInfo={{
          nome: empresa?.nome ?? "",
          mensagem_agradecimento: empresa?.mensagem_agradecimento ?? null,
        }}
        impressaoAutomatica={empresa?.impressao_automatica ?? false}
        impressoraAutomatica={empresa?.impressora_automatica ?? null}
      />
    </div>
  );
}
