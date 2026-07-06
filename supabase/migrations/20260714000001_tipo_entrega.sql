-- Fase 5: entrega ou retirada no local, no pedido feito pelo link do cliente

alter table public.pedidos
  add column tipo_entrega text not null default 'entrega' check (tipo_entrega in ('entrega', 'retirada'));
