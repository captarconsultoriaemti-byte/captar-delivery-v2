-- Fase 1: pedidos (venda direta e lista do dia)

create type public.pedido_status as enum ('aberto', 'fechado');
create type public.pedido_origem as enum ('balcao', 'link');

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas (id) on delete cascade,
  status public.pedido_status not null default 'aberto',
  origem public.pedido_origem not null default 'balcao',
  cliente_nome text,
  cliente_telefone text,
  total numeric(10, 2) not null default 0,
  forma_pagamento text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.pedido_itens (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos (id) on delete cascade,
  produto_id uuid references public.produtos (id) on delete restrict,
  combo_id uuid references public.combos (id) on delete restrict,
  quantidade integer not null default 1,
  preco_unitario numeric(10, 2) not null,
  opcionais_selecionados jsonb not null default '[]'::jsonb,
  observacao text,
  constraint pedido_item_produto_ou_combo check (
    (produto_id is not null and combo_id is null)
    or (produto_id is null and combo_id is not null)
  )
);

create index pedidos_empresa_id_idx on public.pedidos (empresa_id);
create index pedidos_empresa_id_status_idx on public.pedidos (empresa_id, status);
create index pedido_itens_pedido_id_idx on public.pedido_itens (pedido_id);
