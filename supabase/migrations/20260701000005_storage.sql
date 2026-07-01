-- Fase 1: bucket de storage para fotos de produtos do cardapio

insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do nothing;

create policy "leitura publica das fotos de produtos"
  on storage.objects for select
  using (bucket_id = 'produtos');

create policy "empresa envia fotos dos seus produtos"
  on storage.objects for insert
  with check (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa atualiza fotos dos seus produtos"
  on storage.objects for update
  using (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );

create policy "empresa remove fotos dos seus produtos"
  on storage.objects for delete
  using (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = public.current_empresa_id()::text
  );
