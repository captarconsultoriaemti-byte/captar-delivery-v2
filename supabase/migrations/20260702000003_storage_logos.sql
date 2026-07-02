-- Fase 3.1: bucket de storage para logos das empresas
-- upload feito pelo servidor (Server Action com service role), por isso sem policy de insert/update
-- para usuarios comuns - so a leitura publica e necessaria

insert into storage.buckets (id, name, public)
values ('logos-empresas', 'logos-empresas', true)
on conflict (id) do nothing;

create policy "leitura publica dos logos de empresas"
  on storage.objects for select
  using (bucket_id = 'logos-empresas');
