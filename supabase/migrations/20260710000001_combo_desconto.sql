-- Fase 4.7: desconto no combo (preco final = soma dos produtos - desconto, calculado no servidor)

alter table public.combos
  add column tem_desconto boolean not null default false,
  add column desconto_tipo text check (desconto_tipo in ('percentual', 'valor')),
  add column desconto_valor numeric(10, 2);
