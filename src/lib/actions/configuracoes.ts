"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireEmpresa, type ActionResult } from "@/lib/actions/shared";
import { validarHorarioFuncionamento, type HorarioDia } from "@/lib/utils/horario";

interface ConfiguracoesInput {
  taxaEntregaPadrao: number;
  tempoMedioEntrega: string;
  tempoEstimadoPreparo: number;
  mensagemAgradecimento: string;
  horarioFuncionamento: HorarioDia[];
  opcionaisHabilitados: boolean;
}

export async function updateConfiguracoes(
  input: ConfiguracoesInput,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const erroHorario = validarHorarioFuncionamento(input.horarioFuncionamento);
  if (erroHorario) return { error: erroHorario };

  const supabase = await createClient();

  const { error } = await supabase
    .from("empresas")
    .update({
      taxa_entrega_padrao: input.taxaEntregaPadrao,
      tempo_medio_entrega: input.tempoMedioEntrega,
      tempo_estimado_preparo: input.tempoEstimadoPreparo,
      mensagem_agradecimento: input.mensagemAgradecimento,
      horario_funcionamento: input.horarioFuncionamento,
      opcionais_habilitados: input.opcionaisHabilitados,
    })
    .eq("id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/configuracoes");
  return { data: true };
}

export async function atualizarPausaManual(pausada: boolean): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  const supabase = await createClient();

  const { error } = await supabase
    .from("empresas")
    .update({ pausa_manual: pausada })
    .eq("id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/configuracoes");
  revalidatePath("/empresa/inicio");
  return { data: true };
}

export async function atualizarImpressaoAutomatica(
  ativa: boolean,
  impressora: string | null,
): Promise<ActionResult<boolean>> {
  const auth = await requireEmpresa();
  if ("error" in auth) return auth;

  if (ativa && !impressora) {
    return { error: "Selecione uma impressora antes de ativar a impressão automática." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("empresas")
    .update({
      impressao_automatica: ativa,
      impressora_automatica: impressora,
    })
    .eq("id", auth.profile.empresa_id);

  if (error) return { error: error.message };

  revalidatePath("/empresa/configuracoes");
  return { data: true };
}
