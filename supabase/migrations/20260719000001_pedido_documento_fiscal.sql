-- venda direta: cpf/cnpj do pedido para imprimir na via do cliente como comprovante
-- (independente do cpf cadastrado no cliente, pois o comprovante pode ser
-- solicitado com um cnpj de empresa diferente da pessoa que fez o pedido)

alter table public.pedidos
  add column documento_fiscal text;
