-- Fase 3.1: campos adicionais de empresa (CNPJ, responsavel, endereco, logo, whatsapp)
-- aditivo: mantem a coluna tipo_estabelecimento (texto livre) existente, sem uso a partir de agora

alter table public.empresas
  add column tipo_estabelecimento_id uuid references public.tipos_estabelecimento (id),
  add column cnpj text,
  add column nome_responsavel text,
  add column whatsapp text,
  add column logo_url text,
  add column cep text,
  add column logradouro text,
  add column numero text,
  add column complemento text,
  add column bairro text,
  add column cidade text,
  add column estado text;

create index empresas_tipo_estabelecimento_id_idx on public.empresas (tipo_estabelecimento_id);
