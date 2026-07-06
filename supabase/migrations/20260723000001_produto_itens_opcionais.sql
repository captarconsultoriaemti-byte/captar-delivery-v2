-- itens opcionais do produto: diferente dos "adicionais" (que ficam em
-- grupos_opcionais e tem preco), esses sao itens sem valor, cadastrados
-- direto no produto (ex: "Salada" de uma marmita), so pra perguntar se o
-- cliente quer manter ou nao - nao vinculado a outros produtos

create table public.produto_itens_opcionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index produto_itens_opcionais_produto_id_idx on public.produto_itens_opcionais (produto_id);

alter table public.produto_itens_opcionais enable row level security;

create policy "empresa gerencia itens opcionais dos seus produtos"
  on public.produto_itens_opcionais for all
  using (
    exists (
      select 1 from public.produtos p
      where p.id = produto_itens_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.produtos p
      where p.id = produto_itens_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  );
