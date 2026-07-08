-- dias da semana em que o produto fica disponivel (0=domingo ... 6=sabado,
-- mesma convencao do Date.getDay() do JS). Vazio significa "todos os dias",
-- que e o comportamento atual - nao quebra nenhum produto ja cadastrado.
-- Serve pra cardapio que varia por dia (ex: acompanhamento de segunda,
-- terca etc.) sem precisar ativar/desativar produto manualmente todo dia.

alter table public.produtos
  add column dias_semana smallint[] not null default '{}';
