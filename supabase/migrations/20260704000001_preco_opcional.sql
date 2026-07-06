-- Fase 4.2: preco adicional por opcional (0 = gratis, como ate agora)

alter table public.produto_opcionais
  add column preco_adicional numeric(10, 2) not null default 0;
