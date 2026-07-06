-- Cancelamento de pedidos do Link do Cliente: novo estado 'cancelado' na
-- etapa do link, mais campos para solicitacao (pelo cliente) e motivo final
-- (definido na aceitacao pela empresa ou no cancelamento direto)

alter type public.pedido_etapa_link add value 'cancelado';

alter table public.pedidos
  add column motivo_cancelamento text,
  add column cancelamento_solicitado boolean not null default false,
  add column motivo_solicitacao_cancelamento text;
