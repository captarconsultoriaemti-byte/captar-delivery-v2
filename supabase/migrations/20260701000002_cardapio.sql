-- Fase 1: cardapio (categorias, produtos, opcionais, combos)

create table public.categorias (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.categorias
  for each row execute function public.set_updated_at();

create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  categoria_id uuid references public.categorias (id) on delete set null,
  nome text not null,
  descricao text,
  preco numeric(10, 2) not null,
  foto_url text,
  ativo boolean not null default true,
  tem_opcionais boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.produtos
  for each row execute function public.set_updated_at();

create table public.produto_opcionais (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos (id) on delete cascade,
  nome text not null,
  incluido_por_padrao boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.combos
  for each row execute function public.set_updated_at();

-- minimo de 2 produtos por combo e validado na aplicacao, nao no banco
create table public.combo_itens (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.combos (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  quantidade integer not null default 1
);

create index categorias_empresa_id_idx on public.categorias (empresa_id);
create index produtos_empresa_id_idx on public.produtos (empresa_id);
create index produtos_categoria_id_idx on public.produtos (categoria_id);
create index produto_opcionais_produto_id_idx on public.produto_opcionais (produto_id);
create index combos_empresa_id_idx on public.combos (empresa_id);
create index combo_itens_combo_id_idx on public.combo_itens (combo_id);
