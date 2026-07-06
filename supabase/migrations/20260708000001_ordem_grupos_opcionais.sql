-- Fase 4.5: ordem manual dos grupos de adicionais (arrastar e soltar)

alter table public.grupos_opcionais
  add column ordem integer not null default 0;
