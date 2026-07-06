-- Fase 5: impressao automatica via QZ Tray (impressora termica), opcional por empresa

alter table public.empresas
  add column impressao_automatica boolean not null default false,
  add column impressora_automatica text;
