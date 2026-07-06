-- Fase 5: Link do Cliente (cardapio publico + pedido online) e Kanban de pedidos indiretos

alter table public.empresas
  add column slug text unique;

alter table public.pedidos
  add column cliente_id uuid references public.clientes (id) on delete set null,
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column estado text;

create type public.pedido_etapa_link as enum ('novo', 'em_preparo', 'pronto', 'entregue');

alter table public.pedidos
  add column etapa_link public.pedido_etapa_link;

create index pedidos_cliente_id_idx on public.pedidos (cliente_id);
create index pedidos_empresa_id_origem_idx on public.pedidos (empresa_id, origem);
