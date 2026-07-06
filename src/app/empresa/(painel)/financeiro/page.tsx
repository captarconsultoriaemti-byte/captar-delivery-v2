import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { FinanceiroClient, type Periodo } from "./financeiro-client";

function calcularIntervalo(periodo: Periodo, de?: string, ate?: string) {
  const agora = new Date();

  if (periodo === "personalizado" && de && ate) {
    const inicio = new Date(de);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(ate);
    fim.setHours(23, 59, 59, 999);
    return { inicio, fim };
  }

  if (periodo === "semana") {
    const inicio = new Date(agora);
    const diaSemana = inicio.getDay();
    inicio.setDate(inicio.getDate() - diaSemana);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora };
  }

  if (periodo === "mes") {
    const inicio = new Date(agora);
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);
    return { inicio, fim: agora };
  }

  const inicio = new Date(agora);
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fim: agora };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; de?: string; ate?: string }>;
}) {
  const status = await requireOnboardingStatus();
  if (!status.temProduto) redirect("/empresa/cardapio");

  const params = await searchParams;
  const periodo = (params.periodo as Periodo) ?? "hoje";
  const { inicio, fim } = calcularIntervalo(periodo, params.de, params.ate);

  const supabase = await createClient();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id, total, forma_pagamento, origem, closed_at, cliente_nome")
    .eq("status", "fechado")
    .gte("closed_at", inicio.toISOString())
    .lte("closed_at", fim.toISOString())
    .order("closed_at", { ascending: false });

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Financeiro</h1>
      <FinanceiroClient
        pedidos={pedidos ?? []}
        periodo={periodo}
        de={params.de ?? ""}
        ate={params.ate ?? ""}
      />
    </div>
  );
}
