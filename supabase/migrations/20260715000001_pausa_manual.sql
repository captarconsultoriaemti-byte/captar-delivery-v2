-- Fase 5: pausa manual da loja (fechar/reabrir rapidamente, sem mexer no horario de funcionamento)

alter table public.empresas
  add column pausa_manual boolean not null default false;
