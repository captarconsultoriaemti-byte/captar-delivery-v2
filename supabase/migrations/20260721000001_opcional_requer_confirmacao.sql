-- adicionais: permite marcar um item como "so confirmacao" (ex: "quer
-- salada?" sim/nao), separado da lista normal de extras com preco e sem
-- contar na regra de minimo/maximo de escolhas do grupo

alter table public.opcionais
  add column requer_confirmacao boolean not null default false;
