-- adicionais: permite marcar um item do grupo como ja vindo selecionado por
-- padrao (ex: marmita que ja vem com salada, mas o cliente pode desmarcar)

alter table public.opcionais
  add column marcado_padrao boolean not null default false;
