-- estoque maximo do produto: controle manual, editado pela empresa
-- conforme o dia. Nulo = sem controle de estoque (comportamento atual,
-- sempre disponivel). Quando chega a 0, o produto aparece como "Esgotado"
-- na loja e na Venda Direta e nao pode ser adicionado ao pedido.

alter table public.produtos
  add column estoque_maximo integer;

alter table public.produtos
  add constraint produtos_estoque_maximo_check check (estoque_maximo is null or estoque_maximo >= 0);
