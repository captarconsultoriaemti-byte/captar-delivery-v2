-- venda direta: desconto no pedido e divisao entre multiplas formas de pagamento

alter table public.pedidos
  add column desconto_tipo text check (desconto_tipo in ('percentual', 'valor')),
  add column desconto_valor numeric(10, 2),
  add column pagamentos jsonb;
