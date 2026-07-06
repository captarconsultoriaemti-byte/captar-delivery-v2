-- Tela de Clientes (CRUD no painel da empresa)

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  nome text not null,
  whatsapp text,
  cep text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  observacoes text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index clientes_empresa_id_idx on public.clientes (empresa_id);

alter table public.clientes enable row level security;

create policy "admin_master acesso total clientes"
  on public.clientes for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia seus clientes"
  on public.clientes for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());
