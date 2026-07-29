-- data do pedido: informada manualmente na Venda Direta (obrigatoria la),
-- diferente de created_at (gerado automaticamente pelo banco, sempre o
-- momento real de registro no sistema). Nula pra pedidos de outras origens
-- (loja online) ou anteriores a essa mudanca - nesses casos created_at
-- continua servindo de referencia (fallback) na impressao e nos filtros.

alter table public.pedidos
  add column data_pedido date;
