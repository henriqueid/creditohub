
-- Add new fields to enrich the credit dossier
ALTER TABLE public.credit_analysis
  ADD COLUMN IF NOT EXISTS referencias_bancarias text,
  ADD COLUMN IF NOT EXISTS referencias_comerciais text,
  ADD COLUMN IF NOT EXISTS tipo_imovel_sede text,
  ADD COLUMN IF NOT EXISTS numero_funcionarios integer,
  ADD COLUMN IF NOT EXISTS capital_social numeric,
  ADD COLUMN IF NOT EXISTS receita_liquida numeric,
  ADD COLUMN IF NOT EXISTS margem_liquida text,
  ADD COLUMN IF NOT EXISTS indice_liquidez text,
  ADD COLUMN IF NOT EXISTS historico_pagamentos text,
  ADD COLUMN IF NOT EXISTS restricoes_cnpj text,
  ADD COLUMN IF NOT EXISTS tempo_atividade text,
  ADD COLUMN IF NOT EXISTS faturamento_detalhado text,
  ADD COLUMN IF NOT EXISTS condicoes_especiais text,
  ADD COLUMN IF NOT EXISTS modalidade_operacao text,
  ADD COLUMN IF NOT EXISTS taxa_sugerida numeric,
  ADD COLUMN IF NOT EXISTS fonte_informacao text;
