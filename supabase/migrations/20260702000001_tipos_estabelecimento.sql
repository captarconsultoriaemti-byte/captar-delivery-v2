-- Fase 3.1: tipos de estabelecimento (CRUD do Admin Master)

create table public.tipos_estabelecimento (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.tipos_estabelecimento
  for each row execute function public.set_updated_at();

alter table public.tipos_estabelecimento enable row level security;

create policy "admin_master gerencia tipos_estabelecimento"
  on public.tipos_estabelecimento for all
  using (public.is_admin_master())
  with check (public.is_admin_master());
