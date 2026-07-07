-- Taxa de entrega por bairro: a empresa cadastra um valor por bairro: se o
-- bairro do pedido nao bater com nenhum cadastro, cai na taxa_entrega_padrao
-- (ja existente em configuracoes) como fallback.

create table public.bairros_entrega (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  bairro text not null,
  bairro_normalizado text not null,
  valor numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (empresa_id, bairro_normalizado)
);

create index bairros_entrega_empresa_id_idx on public.bairros_entrega (empresa_id);

alter table public.bairros_entrega enable row level security;

create policy "admin_master acesso total bairros_entrega"
  on public.bairros_entrega for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia seus bairros de entrega"
  on public.bairros_entrega for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

alter table public.pedidos add column taxa_entrega numeric(10, 2) not null default 0;
