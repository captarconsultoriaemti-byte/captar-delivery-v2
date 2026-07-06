-- permite um produto pertencer a mais de uma categoria (ex: hamburguer no
-- almoco e no jantar, sem precisar cadastrar 2 vezes) - a coluna
-- produtos.categoria_id fica no banco (nao removida), mas deixa de ser a
-- fonte de verdade: o vinculo passa a morar so nesta tabela nova

create table public.produto_categorias (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  categoria_id uuid not null references public.categorias (id) on delete cascade,
  unique (produto_id, categoria_id)
);

create index produto_categorias_produto_id_idx on public.produto_categorias (produto_id);
create index produto_categorias_categoria_id_idx on public.produto_categorias (categoria_id);

-- migra os vinculos que ja existem em produtos.categoria_id pra tabela nova,
-- sem apagar nem alterar a coluna antiga
insert into public.produto_categorias (produto_id, categoria_id)
select id, categoria_id from public.produtos where categoria_id is not null;

alter table public.produto_categorias enable row level security;

create policy "empresa gerencia categorias dos seus produtos"
  on public.produto_categorias for all
  using (
    exists (
      select 1 from public.produtos p
      where p.id = produto_categorias.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.produtos p
      where p.id = produto_categorias.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  );
