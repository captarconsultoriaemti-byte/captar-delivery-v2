-- observacao geral do pedido (ex: "tirar a salada da marmita 2"), mais simples
-- que configurar adicional por adicional quando o cliente pede varias marmitas

alter table public.pedidos
  add column observacoes text;
