-- itens opcionais ganham um "grupo_titulo": quando nulo, o item continua
-- sendo uma pergunta sim/nao independente (comportamento atual). Quando
-- preenchido, todos os itens do mesmo produto com o mesmo grupo_titulo
-- formam uma pergunta de escolha unica (ex: "Carne ou Frango"), sem preco -
-- pra isso ja existem os Grupos de Adicionais, que sao outra coisa.

alter table public.produto_itens_opcionais
  add column grupo_titulo text;
