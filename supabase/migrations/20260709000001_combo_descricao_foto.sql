-- Fase 4.6: descricao e foto para combos (aditivo)

alter table public.combos
  add column descricao text,
  add column foto_url text;

insert into storage.buckets (id, name, public)
values ('combos', 'combos', true)
on conflict (id) do nothing;

create policy "leitura publica das fotos de combos"
  on storage.objects for select
  using (bucket_id = 'combos');

create policy "empresa envia fotos dos seus combos"
  on storage.objects for insert
  with check (
    bucket_id = 'combos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa atualiza fotos dos seus combos"
  on storage.objects for update
  using (
    bucket_id = 'combos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
