-- Fase 4.4: ordem manual dos produtos no cardapio (arrastar e soltar)

alter table public.produtos
  add column ordem integer not null default 0;
