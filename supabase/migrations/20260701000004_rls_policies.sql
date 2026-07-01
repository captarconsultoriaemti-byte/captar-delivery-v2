-- Fase 1: RLS - admin master tem acesso total, empresa so ve seus proprios dados

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.produto_opcionais enable row level security;
alter table public.combos enable row level security;
alter table public.combo_itens enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;

-- empresas
create policy "admin_master gerencia empresas"
  on public.empresas for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa le seus proprios dados"
  on public.empresas for select
  using (id = public.current_empresa_id());

create policy "empresa atualiza seus proprios dados"
  on public.empresas for update
  using (id = public.current_empresa_id())
  with check (id = public.current_empresa_id());

-- profiles
create policy "admin_master gerencia profiles"
  on public.profiles for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "usuario le o proprio profile"
  on public.profiles for select
  using (id = auth.uid());

-- categorias
create policy "admin_master acesso total categorias"
  on public.categorias for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia suas categorias"
  on public.categorias for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- produtos
create policy "admin_master acesso total produtos"
  on public.produtos for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia seus produtos"
  on public.produtos for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- produto_opcionais (empresa via produto)
create policy "admin_master acesso total produto_opcionais"
  on public.produto_opcionais for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia opcionais dos seus produtos"
  on public.produto_opcionais for all
  using (
    exists (
      select 1 from public.produtos p
      where p.id = produto_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.produtos p
      where p.id = produto_opcionais.produto_id
        and p.empresa_id = public.current_empresa_id()
    )
  );

-- combos
create policy "admin_master acesso total combos"
  on public.combos for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia seus combos"
  on public.combos for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- combo_itens (empresa via combo)
create policy "admin_master acesso total combo_itens"
  on public.combo_itens for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia itens dos seus combos"
  on public.combo_itens for all
  using (
    exists (
      select 1 from public.combos c
      where c.id = combo_itens.combo_id
        and c.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.combos c
      where c.id = combo_itens.combo_id
        and c.empresa_id = public.current_empresa_id()
    )
  );

-- pedidos
create policy "admin_master acesso total pedidos"
  on public.pedidos for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia seus pedidos"
  on public.pedidos for all
  using (empresa_id = public.current_empresa_id())
  with check (empresa_id = public.current_empresa_id());

-- pedido_itens (empresa via pedido)
create policy "admin_master acesso total pedido_itens"
  on public.pedido_itens for all
  using (public.is_admin_master())
  with check (public.is_admin_master());

create policy "empresa gerencia itens dos seus pedidos"
  on public.pedido_itens for all
  using (
    exists (
      select 1 from public.pedidos ped
      where ped.id = pedido_itens.pedido_id
        and ped.empresa_id = public.current_empresa_id()
    )
  )
  with check (
    exists (
      select 1 from public.pedidos ped
      where ped.id = pedido_itens.pedido_id
        and ped.empresa_id = public.current_empresa_id()
    )
  );
