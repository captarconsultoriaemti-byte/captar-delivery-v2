import { createClient } from "@/lib/supabase/server";
import { requireOnboardingStatus } from "@/lib/onboarding";
import { normalizarHorarios, type HorarioDia } from "@/lib/utils/horario";
import { ConfiguracoesClient } from "./configuracoes-client";

const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export default async function ConfiguracoesPage() {
  const status = await requireOnboardingStatus();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("empresa_id")
    .eq("id", user!.id)
    .single();

  const { data: empresa } = await supabase
    .from("empresas")
    .select(
      "id, slug, taxa_entrega_padrao, tempo_medio_entrega, tempo_estimado_preparo, mensagem_agradecimento, horario_funcionamento, opcionais_habilitados, pausa_manual, impressao_automatica, impressora_automatica",
    )
    .eq("id", profile!.empresa_id)
    .single();

  const horarioSalvo: Record<string, HorarioDia> = Object.fromEntries(
    normalizarHorarios(empresa?.horario_funcionamento ?? []).map((h) => [h.dia, h]),
  );

  const horarioFuncionamento: HorarioDia[] = DIAS_SEMANA.map((dia) => ({
    dia,
    ativo: horarioSalvo[dia]?.ativo ?? false,
    turnos: horarioSalvo[dia]?.turnos ?? [{ abre: null, fecha: null }],
  }));

  const configuracoesPreenchidas = Boolean(
    empresa?.tempo_medio_entrega && empresa?.tempo_estimado_preparo != null,
  );
  const podeCompartilharLink = status.completo && configuracoesPreenchidas;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Configurações</h1>
      <p className="mb-6 text-sm text-secondary">Configurações operacionais e do comprovante</p>
      <ConfiguracoesClient
        podeCompartilharLink={podeCompartilharLink}
        pausaManual={empresa?.pausa_manual ?? false}
        impressaoAutomatica={empresa?.impressao_automatica ?? false}
        impressoraAutomatica={empresa?.impressora_automatica ?? null}
        slug={empresa?.slug ?? ""}
        taxaEntregaPadrao={empresa?.taxa_entrega_padrao ?? 0}
        tempoMedioEntrega={empresa?.tempo_medio_entrega ?? ""}
        tempoEstimadoPreparo={empresa?.tempo_estimado_preparo ?? 0}
        mensagemAgradecimento={empresa?.mensagem_agradecimento ?? "Obrigado pela preferência!"}
        horarioFuncionamento={horarioFuncionamento}
        opcionaisHabilitados={empresa?.opcionais_habilitados ?? true}
      />
    </div>
  );
}
