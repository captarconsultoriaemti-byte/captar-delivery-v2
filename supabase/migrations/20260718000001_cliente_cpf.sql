-- cadastro de clientes: cpf opcional

alter table public.clientes
  add column cpf text;
