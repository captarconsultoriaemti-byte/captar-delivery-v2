-- Fase 4.1: configuracoes operacionais e do comprovante da empresa (aditivo)

alter table public.empresas
  add column taxa_entrega_padrao numeric(10, 2) not null default 0,
  add column tempo_medio_entrega text,
  add column tempo_estimado_preparo integer,
  add column mensagem_agradecimento text not null default 'Obrigado pela preferência!',
  add column horario_funcionamento jsonb not null default '[]'::jsonb;
