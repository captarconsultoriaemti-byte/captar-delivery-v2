-- Fase 4.3: produto em destaque e desconto (percentual ou valor fixo)

alter table public.produtos
  add column destaque boolean not null default false,
  add column tem_desconto boolean not null default false,
  add column desconto_tipo text check (desconto_tipo in ('percentual', 'valor')),
  add column desconto_valor numeric(10, 2);
