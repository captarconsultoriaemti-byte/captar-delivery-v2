-- Fase 4.2 (revisao): grupos de opcionais reutilizaveis, no padrao de mercado
-- (iFood, Anota Ai, Goomer) - cadastra o grupo uma vez, vincula em varios produtos.
-- a tabela produto_opcionais antiga fica sem uso a partir de agora (aditivo, nao removida).

create table public.grupos_opcionais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  obrigatorio boolean not null default false,
  minimo_selecao integer not null default 0,
  maximo_selecao integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.grupos_opcionais
  for each row execute function public.set_updated_at();

create table public.opcionais (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_opcionais (id) on delete cascade,
  nome text not null,
  preco_adicional numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.produto_grupos_opcionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  grupo_id uuid not null references public.grupos_opcionais (id) on delete cascade,
  unique (produto_id, grupo_id)
);

create index grupos_opcionais_empresa_id_idx on public.grupos_opcionais (empresa_id);
create index opcionais_grupo_id_idx on public.opcionais (grupo_id);
create index produto_grupos_opcionais_produto_id_idx on public.produto_grupos_opcionais (produto_id);
create index produto_grupos_opcionais_grupo_id_idx on public.produto_grupos_opcionais (grupo_id);

alter table public.grupos_opcionais enable row level security;
alter table public.opcionais enable row level security;
alter table public.produto_grupos_opcionais enable row level security;

create policy "empresa gerencia seus grupos_opcionais"
  on public.grupos_opcionais for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

create policy "empresa gerencia opcionais dos seus grupos"
  on public.opcionais for all
  using (
    exists (
      select 1 from public.grupos_opcionais g
      where g.id = opcionais.grupo_id
        and g.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.grupos_opcionais g
      where g.id = opcionais.grupo_id
        and g.empresa_id = public.current_empresa_id()
    )
  );

create policy "empresa gerencia vinculos de grupos nos seus produtos"
  on public.produto_grupos_opcionais for all
  using (
    exists (
      select 1 from public.produtos p
      where p.id = produto_grupos_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.produtos p
      where p.id = produto_grupos_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  );
