-- Fase 1: perfis (roles) e empresas (tenants)

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create type public.user_role as enum ('admin_master', 'empresa');
create type public.empresa_status as enum ('trial', 'active', 'suspended', 'cancelled');

create table public.empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  tipo_estabelecimento text,
  status public.empresa_status not null default 'trial',
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  asaas_customer_id text,
  fiscal_module_enabled boolean not null default false,
  opcionais_habilitados boolean not null default true,
  kanban_habilitado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.empresas
  for each row execute function public.set_updated_at();

-- profiles liga auth.users a uma role e (se aplicavel) a uma empresa
-- linhas sao inseridas pela aplicacao (service role) no momento do cadastro,
-- nao ha trigger automatico em auth.users para evitar atribuicao errada de role
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  empresa_id uuid references public.empresas (id) on delete cascade,
  role public.user_role not null default 'empresa',
  email text not null,
  created_at timestamptz not null default now(),
  constraint empresa_id_required_for_role check (
    (role = 'admin_master' and empresa_id is null)
    or (role = 'empresa' and empresa_id is not null)
  )
);

-- funcao security definer usada pelas policies de RLS para checar se o
-- usuario autenticado e admin master, sem recursao nas policies de profiles
create or replace function public.is_admin_master()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin_master'
  );
$$;

-- retorna a empresa_id do usuario autenticado (null para admin master)
create or replace function public.current_empresa_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select empresa_id from public.profiles where id = auth.uid();
$$;
