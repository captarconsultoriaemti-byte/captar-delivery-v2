export interface TurnoHorario {
  abre: string | null;
  fecha: string | null;
}

export interface HorarioDia {
  dia: string;
  ativo: boolean;
  turnos: TurnoHorario[];
}

// dados salvos antes da fase de multi-turno tinham abre/fecha direto no dia;
// converte pro formato novo (turnos[]) sem precisar de migration no banco,
// ja que horario_funcionamento e um jsonb livre
export function normalizarHorarios(
  raw: (Partial<HorarioDia> & { abre?: string | null; fecha?: string | null })[],
): HorarioDia[] {
  return raw.map((dia) => ({
    dia: dia.dia ?? "",
    ativo: dia.ativo ?? false,
    turnos:
      dia.turnos && dia.turnos.length > 0
        ? dia.turnos
        : [{ abre: dia.abre ?? null, fecha: dia.fecha ?? null }],
  }));
}

// regras de negocio: pelo menos 1 dia ativo com pelo menos 1 turno preenchido,
// abre/fecha obrigatorios em todo turno de um dia ativo, nao podem ser iguais,
// e fecha tem que ser depois de abre (nao aceita turno que vira a virada do
// dia, ex: 18h-10h) - quem precisar disso cadastra 2 turnos separados
export function validarHorarioFuncionamento(horarios: HorarioDia[]): string | null {
  const ativos = horarios.filter((h) => h.ativo);

  if (ativos.length === 0) {
    return "Marque pelo menos 1 dia de funcionamento com horário.";
  }

  for (const dia of ativos) {
    if (dia.turnos.length === 0) {
      return `Adicione pelo menos 1 turno em ${dia.dia}.`;
    }
    for (const turno of dia.turnos) {
      if (!turno.abre || !turno.fecha) {
        return `Preencha o horário de abertura e fechamento de ${dia.dia}.`;
      }
      if (turno.abre === turno.fecha) {
        return `Em ${dia.dia}, um dos turnos tem abertura e fechamento iguais.`;
      }
      if (turno.abre > turno.fecha) {
        return `Em ${dia.dia}, um dos turnos tem fechamento antes da abertura.`;
      }
    }

    for (let i = 0; i < dia.turnos.length; i++) {
      for (let j = i + 1; j < dia.turnos.length; j++) {
        const a = dia.turnos[i];
        const b = dia.turnos[j];
        if (a.abre! < b.fecha! && b.abre! < a.fecha!) {
          return `Em ${dia.dia}, os turnos não podem se sobrepor (${a.abre}-${a.fecha} e ${b.abre}-${b.fecha}).`;
        }
      }
    }
  }

  return null;
}

const DIAS_SEMANA_ORDEM = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export interface StatusFuncionamento {
  aberto: boolean;
  horarioHoje: HorarioDia | null;
}

// calcula se a loja esta aberta agora, sempre no fuso horario de Brasilia,
// independente de onde o servidor esteja rodando. pausaManual sobrepoe o
// horario normal (fechamento rapido e manual, sem mexer no cadastro de horarios)
export function calcularStatusFuncionamento(
  horarios: HorarioDia[],
  pausaManual = false,
): StatusFuncionamento {
  const agora = new Date();
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(agora);

  const weekdayEn = partes.find((p) => p.type === "weekday")?.value ?? "Sunday";
  const hora = partes.find((p) => p.type === "hour")?.value ?? "00";
  const minuto = partes.find((p) => p.type === "minute")?.value ?? "00";
  const horaAtual = `${hora}:${minuto}`;

  const indiceSemana: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const diaDeHoje = DIAS_SEMANA_ORDEM[indiceSemana[weekdayEn] ?? 0];
  const horarioHoje = horarios.find((h) => h.dia === diaDeHoje) ?? null;

  const aberto =
    !pausaManual &&
    Boolean(
      horarioHoje?.ativo &&
        horarioHoje.turnos.some(
          (turno) => turno.abre && turno.fecha && horaAtual >= turno.abre && horaAtual <= turno.fecha,
        ),
    );

  return { aberto, horarioHoje };
}

export function formatarTurnos(dia: HorarioDia): string {
  if (!dia.ativo || dia.turnos.length === 0) return "Fechado";

  const validos = dia.turnos.filter((t) => t.abre && t.fecha);
  if (validos.length === 0) return "Fechado";

  return validos.map((t) => `${t.abre} às ${t.fecha}`).join(" e ");
}
