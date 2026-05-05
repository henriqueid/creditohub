
-- Create enum types
DROP TYPE IF EXISTS public.credit_recommendation CASCADE;
CREATE TYPE public.credit_recommendation AS ENUM ('approve', 'restrict', 'reject');
DROP TYPE IF EXISTS public.credit_status CASCADE;
CREATE TYPE public.credit_status AS ENUM ('draft', 'in_committee', 'approved', 'approved_restricted', 'rejected');
DROP TYPE IF EXISTS public.committee_vote CASCADE;
CREATE TYPE public.committee_vote AS ENUM ('approve', 'restrict', 'reject');

-- Clients (Cedentes)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj_cpf TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  data_fundacao DATE,
  segmento TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Credit Analysis
CREATE TABLE public.credit_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  responsavel_comercial TEXT,
  analista_credito TEXT,
  data_analise DATE DEFAULT CURRENT_DATE,
  faturamento_medio DECIMAL(15,2),
  volume_estimado DECIMAL(15,2),
  prazo_medio_titulos INTEGER,
  historico_socios TEXT,
  credit_score INTEGER,
  protestos TEXT,
  pendencias TEXT,
  cheques_sem_fundo TEXT,
  acoes_judiciais TEXT,
  observacoes_credito TEXT,
  analise_faturamento TEXT,
  estrutura_financeira TEXT,
  endividamento TEXT,
  dependencia_clientes TEXT,
  riscos TEXT,
  pontos_positivos TEXT,
  limite_sugerido DECIMAL(15,2),
  prazo_medio_permitido INTEGER,
  concentracao_maxima DECIMAL(5,2),
  garantias TEXT,
  parecer_analista TEXT,
  recommendation public.credit_recommendation,
  status public.credit_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to credit_analysis" ON public.credit_analysis FOR ALL USING (true) WITH CHECK (true);

-- Sacados
CREATE TABLE public.credit_analysis_sacados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  sacado_nome TEXT NOT NULL,
  percentual_faturamento DECIMAL(5,2),
  prazo_medio INTEGER
);

ALTER TABLE public.credit_analysis_sacados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sacados" ON public.credit_analysis_sacados FOR ALL USING (true) WITH CHECK (true);

-- Sócios
CREATE TABLE public.credit_analysis_socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  participacao DECIMAL(5,2),
  cargo TEXT
);

ALTER TABLE public.credit_analysis_socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to socios" ON public.credit_analysis_socios FOR ALL USING (true) WITH CHECK (true);

-- Committee Votes
CREATE TABLE public.credit_committee (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_role TEXT,
  vote public.committee_vote NOT NULL,
  observation TEXT,
  vote_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_committee ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to credit_committee" ON public.credit_committee FOR ALL USING (true) WITH CHECK (true);

-- Committee Result
CREATE TABLE public.committee_result (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE UNIQUE,
  limite_aprovado DECIMAL(15,2),
  prazo_aprovado INTEGER,
  concentracao_maxima DECIMAL(5,2),
  condicoes_adicionais TEXT,
  decisao_final public.credit_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_result ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to committee_result" ON public.committee_result FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_credit_analysis_updated_at
  BEFORE UPDATE ON public.credit_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for analysis attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('analysis-attachments', 'analysis-attachments', true);

-- Attachments table linked to analysis sections
CREATE TABLE public.credit_analysis_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  section TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  ai_extracted_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI insights table
CREATE TABLE public.credit_analysis_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  section TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies
ALTER TABLE public.credit_analysis_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_analysis_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to attachments" ON public.credit_analysis_attachments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to insights" ON public.credit_analysis_insights FOR ALL TO public USING (true) WITH CHECK (true);

-- Storage RLS
CREATE POLICY "Allow all uploads to analysis-attachments" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'analysis-attachments');
CREATE POLICY "Allow all reads from analysis-attachments" ON storage.objects FOR SELECT TO public USING (bucket_id = 'analysis-attachments');
CREATE POLICY "Allow all deletes from analysis-attachments" ON storage.objects FOR DELETE TO public USING (bucket_id = 'analysis-attachments');

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

CREATE TABLE public.blacklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('cpf', 'cnpj')),
  motivo TEXT,
  adicionado_por TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_blacklist_documento ON public.blacklist (documento);

ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to blacklist"
ON public.blacklist
FOR ALL
USING (true)
WITH CHECK (true);

-- System settings key-value store
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}',
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to system_settings"
ON public.system_settings FOR ALL
USING (true)
WITH CHECK (true);

-- Seed default settings
INSERT INTO public.system_settings (key, value, category, description) VALUES
  ('company_name', '"CréditoHub"', 'general', 'Nome da empresa exibido no sistema'),
  ('company_cnpj', '""', 'general', 'CNPJ da empresa'),
  ('min_committee_members', '3', 'approval', 'Número mínimo de membros para votação no comitê'),
  ('auto_approve_score', '800', 'approval', 'Score mínimo para aprovação automática'),
  ('auto_reject_score', '300', 'approval', 'Score máximo para rejeição automática'),
  ('max_concentration', '30', 'approval', 'Concentração máxima permitida (%) por sacado'),
  ('max_term_days', '120', 'approval', 'Prazo máximo permitido em dias'),
  ('default_rate', '2.5', 'approval', 'Taxa padrão sugerida (%)'),
  ('min_limit_amount', '10000', 'approval', 'Limite mínimo de operação (R$)'),
  ('auto_blacklist_check', 'true', 'automation', 'Verificar blacklist automaticamente ao criar análise'),
  ('auto_score_calculation', 'true', 'automation', 'Calcular score de crédito automaticamente'),
  ('auto_send_committee', 'false', 'automation', 'Enviar automaticamente ao comitê quando análise for preenchida'),
  ('notify_committee_pending', 'true', 'automation', 'Notificar membros sobre análises pendentes no comitê'),
  ('days_to_expire_analysis', '90', 'automation', 'Dias para expirar uma análise sem movimentação');

-- Tabela de regras do motor de crédito
CREATE TABLE public.credit_engine_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('score_range', 'weight', 'limit_factor', 'rate', 'cutoff', 'auto_approve', 'concentration', 'deadline', 'custom')),
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_engine_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to credit_engine_rules"
ON public.credit_engine_rules
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_credit_engine_rules_updated_at
BEFORE UPDATE ON public.credit_engine_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed com regras padrão do motor
INSERT INTO public.credit_engine_rules (rule_name, rule_type, description, parameters, priority) VALUES
-- Faixas de Score
('Score AAA', 'score_range', 'Classificação AAA - Risco Muito Baixo', '{"min": 900, "max": 1000, "grade": "AAA", "risk_label": "Muito Baixo", "color": "#059669"}', 1),
('Score AA', 'score_range', 'Classificação AA - Risco Baixo', '{"min": 800, "max": 899, "grade": "AA", "risk_label": "Baixo", "color": "#10b981"}', 2),
('Score A', 'score_range', 'Classificação A - Risco Baixo-Médio', '{"min": 700, "max": 799, "grade": "A", "risk_label": "Baixo-Médio", "color": "#34d399"}', 3),
('Score BBB', 'score_range', 'Classificação BBB - Risco Médio', '{"min": 600, "max": 699, "grade": "BBB", "risk_label": "Médio", "color": "#fbbf24"}', 4),
('Score BB', 'score_range', 'Classificação BB - Risco Médio-Alto', '{"min": 500, "max": 599, "grade": "BB", "risk_label": "Médio-Alto", "color": "#f59e0b"}', 5),
('Score B', 'score_range', 'Classificação B - Risco Alto', '{"min": 400, "max": 499, "grade": "B", "risk_label": "Alto", "color": "#f97316"}', 6),
('Score CCC', 'score_range', 'Classificação CCC - Risco Muito Alto', '{"min": 300, "max": 399, "grade": "CCC", "risk_label": "Muito Alto", "color": "#ef4444"}', 7),
('Score CC', 'score_range', 'Classificação CC - Risco Crítico', '{"min": 200, "max": 299, "grade": "CC", "risk_label": "Crítico", "color": "#dc2626"}', 8),
('Score C', 'score_range', 'Classificação C - Risco Severo', '{"min": 100, "max": 199, "grade": "C", "risk_label": "Severo", "color": "#b91c1c"}', 9),
('Score D', 'score_range', 'Classificação D - Default', '{"min": 0, "max": 99, "grade": "D", "risk_label": "Default", "color": "#7f1d1d"}', 10),

-- Pesos do Radar de Risco
('Peso - Score Crédito', 'weight', 'Peso da dimensão Score de Crédito no radar', '{"dimension": "credito", "weight": 25}', 1),
('Peso - Restritivos', 'weight', 'Peso da dimensão Restritivos no radar', '{"dimension": "restritivos", "weight": 20}', 2),
('Peso - Capacidade', 'weight', 'Peso da dimensão Capacidade Financeira no radar', '{"dimension": "capacidade", "weight": 12}', 3),
('Peso - Concentração', 'weight', 'Peso da dimensão Concentração de Sacados no radar', '{"dimension": "concentracao", "weight": 10}', 4),
('Peso - Rentabilidade', 'weight', 'Peso da dimensão Rentabilidade no radar', '{"dimension": "rentabilidade", "weight": 10}', 5),
('Peso - Maturidade', 'weight', 'Peso da dimensão Maturidade do Negócio no radar', '{"dimension": "maturidade", "weight": 8}', 6),
('Peso - Diversificação', 'weight', 'Peso da dimensão Diversificação de Sacados no radar', '{"dimension": "diversificacao", "weight": 8}', 7),
('Peso - Pagamentos', 'weight', 'Peso da dimensão Histórico de Pagamentos no radar', '{"dimension": "pagamentos", "weight": 7}', 8),

-- Fatores de Limite por faixa de score
('Limite - Score >= 800', 'limit_factor', 'Fator de limite para score >= 800', '{"min_score": 800, "factor_percent": 30}', 1),
('Limite - Score >= 600', 'limit_factor', 'Fator de limite para score >= 600', '{"min_score": 600, "factor_percent": 25}', 2),
('Limite - Score >= 400', 'limit_factor', 'Fator de limite para score >= 400', '{"min_score": 400, "factor_percent": 20}', 3),
('Limite - Score >= 200', 'limit_factor', 'Fator de limite para score >= 200', '{"min_score": 200, "factor_percent": 15}', 4),
('Limite - Score < 200', 'limit_factor', 'Fator de limite para score < 200', '{"min_score": 0, "factor_percent": 10}', 5),

-- Taxas por faixa
('Taxa - Score >= 800', 'rate', 'Taxa base para score >= 800', '{"min_score": 800, "base_rate": 1.5, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 1),
('Taxa - Score >= 600', 'rate', 'Taxa base para score >= 600', '{"min_score": 600, "base_rate": 2.0, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 2),
('Taxa - Score >= 400', 'rate', 'Taxa base para score >= 400', '{"min_score": 400, "base_rate": 2.8, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 3),
('Taxa - Score < 400', 'rate', 'Taxa base para score < 400', '{"min_score": 0, "base_rate": 3.5, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 4),

-- Regras de corte (auto-reject)
('Corte - Score Mínimo', 'cutoff', 'Rejeitar automaticamente se score abaixo do mínimo', '{"field": "credit_score", "operator": "lt", "value": 150, "action": "reject", "message": "Score abaixo do mínimo aceitável"}', 1),
('Corte - Protestos', 'cutoff', 'Alertar se possui protestos', '{"field": "protestos", "operator": "not_nada_consta", "action": "alert", "message": "Possui protestos registrados"}', 2),
('Corte - Ações Judiciais', 'cutoff', 'Alertar se possui ações judiciais', '{"field": "acoes_judiciais", "operator": "not_nada_consta", "action": "alert", "message": "Possui ações judiciais"}', 3),
('Corte - Tempo Atividade', 'cutoff', 'Alertar se menos de 2 anos de atividade', '{"field": "tempo_atividade", "operator": "lt_years", "value": 2, "action": "alert", "message": "Empresa com menos de 2 anos de atividade"}', 4),

-- Regras de aprovação automática
('Auto-Aprovação', 'auto_approve', 'Aprovar automaticamente se atender todos os critérios', '{"min_score": 750, "max_concentration": 25, "requires_nada_consta": true, "min_years": 3, "min_sacados": 3}', 1),

-- Concentração
('Concentração Máxima', 'concentration', 'Limite máximo de concentração por sacado', '{"max_single_percent": 30, "max_hhi": 2500, "min_sacados": 3}', 1),

-- Prazos
('Prazo Máximo', 'deadline', 'Prazo máximo permitido para títulos', '{"max_prazo_dias": 90, "prazo_ideal_dias": 30}', 1);

-- Tabela de notas fiscais monitoradas
CREATE TABLE public.monitored_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  chave_acesso TEXT,
  numero_nf TEXT,
  serie TEXT,
  data_emissao DATE,
  valor NUMERIC,
  destinatario_cnpj TEXT,
  destinatario_nome TEXT,
  natureza_operacao TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'cancelled', 'not_found')),
  validation_message TEXT,
  xml_data JSONB,
  source TEXT NOT NULL DEFAULT 'xml' CHECK (source IN ('xml', 'cnab', 'manual', 'api')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monitored_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to monitored_invoices" ON public.monitored_invoices FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_monitored_invoices_updated_at
BEFORE UPDATE ON public.monitored_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_monitored_invoices_client ON public.monitored_invoices(client_id);
CREATE INDEX idx_monitored_invoices_dest ON public.monitored_invoices(destinatario_cnpj);

-- Tabela de informe patrimonial
CREATE TABLE public.patrimonial_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('imovel', 'veiculo', 'participacao_societaria', 'aplicacao_financeira', 'equipamento', 'outro')),
  descricao TEXT NOT NULL,
  valor_estimado NUMERIC,
  proprietario TEXT,
  documento_proprietario TEXT,
  matricula_registro TEXT,
  localizacao TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patrimonial_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to patrimonial_info" ON public.patrimonial_info FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_patrimonial_info_updated_at
BEFORE UPDATE ON public.patrimonial_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de configurações de integração
CREATE TABLE public.integration_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('export_cadastro', 'webhook', 'api_sync')),
  api_url TEXT,
  auth_type TEXT DEFAULT 'bearer' CHECK (auth_type IN ('bearer', 'basic', 'api_key', 'none')),
  auth_secret_name TEXT,
  field_mapping JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to integration_configs" ON public.integration_configs FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_integration_configs_updated_at
BEFORE UPDATE ON public.integration_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.bankruptcy_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  document TEXT,
  type TEXT NOT NULL DEFAULT 'falencia' CHECK (type IN ('falencia', 'recuperacao_judicial', 'recuperacao_extrajudicial', 'liquidacao')),
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'deferido', 'indeferido', 'encerrado')),
  court TEXT,
  process_number TEXT,
  filing_date DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'diario_oficial', 'consulta_publica', 'api')),
  notes TEXT,
  matched_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  matched_sacado_names TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bankruptcy_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bankruptcy_records" ON public.bankruptcy_records FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_bankruptcy_document ON public.bankruptcy_records(document);
CREATE INDEX idx_bankruptcy_matched_client ON public.bankruptcy_records(matched_client_id);

-- Grupos de monitoramento
CREATE TABLE public.monitoring_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  alerta_email BOOLEAN NOT NULL DEFAULT false,
  alerta_sistema BOOLEAN NOT NULL DEFAULT true,
  limiar_variacao NUMERIC DEFAULT 20,
  limiar_atraso_dias INTEGER DEFAULT 5,
  concentracao_maxima NUMERIC DEFAULT 30,
  volume_minimo NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to monitoring_groups"
ON public.monitoring_groups FOR ALL
USING (true) WITH CHECK (true);

-- Relacionamento grupo <-> clientes
CREATE TABLE public.monitoring_group_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.monitoring_groups(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, client_id)
);

ALTER TABLE public.monitoring_group_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to monitoring_group_clients"
ON public.monitoring_group_clients FOR ALL
USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_monitoring_groups_updated_at
BEFORE UPDATE ON public.monitoring_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  cargo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all profiles
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create audit log table
CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name text NOT NULL,
  record_id text NOT NULL,
  action text NOT NULL, -- insert, update, delete
  old_data jsonb,
  new_data jsonb,
  changed_by uuid,
  changed_by_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);
CREATE INDEX idx_audit_log_record_id ON public.audit_log(record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view audit logs
CREATE POLICY "Authenticated users can view audit logs"
ON public.audit_log
FOR SELECT
TO authenticated
USING (true);

-- Only the system (via trigger) can insert
CREATE POLICY "System can insert audit logs"
ON public.audit_log
FOR INSERT
TO public
WITH CHECK (true);

-- Create the audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'insert', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'update', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, record_id, action, old_data, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'delete', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to key tables
CREATE TRIGGER audit_credit_analysis
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_analysis
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_blacklist
  AFTER INSERT OR UPDATE OR DELETE ON public.blacklist
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_credit_engine_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_engine_rules
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_system_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_committee_result
  AFTER INSERT OR UPDATE OR DELETE ON public.committee_result
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_monitoring_groups
  AFTER INSERT OR UPDATE OR DELETE ON public.monitoring_groups
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_log;
-- Deal stages (configurável)
CREATE TABLE public.deal_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_won BOOLEAN NOT NULL DEFAULT false,
  is_lost BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deal_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage deal_stages"
ON public.deal_stages FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Insert default stages
INSERT INTO public.deal_stages (name, "order", color, is_won, is_lost) VALUES
  ('Prospecção', 1, '#8b5cf6', false, false),
  ('Qualificação', 2, '#3b82f6', false, false),
  ('Proposta', 3, '#f59e0b', false, false),
  ('Negociação', 4, '#f97316', false, false),
  ('Fechado Ganho', 5, '#22c55e', true, false),
  ('Fechado Perdido', 6, '#ef4444', false, true);

-- Contacts
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  department TEXT,
  is_decision_maker BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage contacts"
ON public.contacts FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Deals (oportunidades)
CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  stage_id UUID NOT NULL REFERENCES public.deal_stages(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  value NUMERIC,
  probability INTEGER DEFAULT 50,
  expected_close_date DATE,
  responsible TEXT,
  loss_reason TEXT,
  notes TEXT,
  credit_analysis_id UUID REFERENCES public.credit_analysis(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage deals"
ON public.deals FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Activities (interações)
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'note',
  description TEXT NOT NULL,
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage activities"
ON public.activities FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- CRM Tasks
CREATE TABLE public.crm_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage crm_tasks"
ON public.crm_tasks FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Tags
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tags"
ON public.tags FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Client tags (N:N)
CREATE TABLE public.client_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, tag_id)
);

ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage client_tags"
ON public.client_tags FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX idx_deals_client_id ON public.deals(client_id);
CREATE INDEX idx_deals_stage_id ON public.deals(stage_id);
CREATE INDEX idx_activities_client_id ON public.activities(client_id);
CREATE INDEX idx_activities_deal_id ON public.activities(deal_id);
CREATE INDEX idx_crm_tasks_client_id ON public.crm_tasks(client_id);
CREATE INDEX idx_crm_tasks_deal_id ON public.crm_tasks(deal_id);
CREATE INDEX idx_crm_tasks_status ON public.crm_tasks(status);
CREATE INDEX idx_client_tags_client_id ON public.client_tags(client_id);
CREATE INDEX idx_client_tags_tag_id ON public.client_tags(tag_id);
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Prospects table for auto-qualified leads
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  documento TEXT NOT NULL,
  nome TEXT,
  tipo TEXT NOT NULL DEFAULT 'cnpj',
  qualification_status TEXT NOT NULL DEFAULT 'pending',
  qualification_score INTEGER,
  risk_level TEXT DEFAULT 'unknown',
  qualification_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'consulta',
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast document lookups
CREATE UNIQUE INDEX idx_prospects_documento ON public.prospects(documento);
CREATE INDEX idx_prospects_status ON public.prospects(qualification_status);
CREATE INDEX idx_prospects_expires ON public.prospects(expires_at);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage prospects"
ON public.prospects
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_prospects_updated_at
BEFORE UPDATE ON public.prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add default qualification validity setting (30 days)
INSERT INTO public.system_settings (key, category, value, description)
VALUES (
  'prospect_qualification_validity_days',
  'prospects',
  '30',
  'Número de dias que a qualificação de um prospect permanece válida'
)
ON CONFLICT (key) DO NOTHING;
-- =====================================================
-- FASE 1: ENUMS E TABELAS BASE
-- =====================================================

-- Enum de roles do app
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'analista', 'comite', 'leitor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum de tipo de tenant
DO $$ BEGIN
  CREATE TYPE public.tenant_type AS ENUM ('fidc', 'securitizadora', 'factoring', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum de plano
DO $$ BEGIN
  CREATE TYPE public.tenant_plan AS ENUM ('essencial', 'profissional', 'avancado', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  tipo public.tenant_type NOT NULL DEFAULT 'outro',
  ativo BOOLEAN NOT NULL DEFAULT true,
  plano public.tenant_plan NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- =====================================================
-- FASE 2: TENANT DEFAULT + MIGRAÇÃO DE DADOS
-- =====================================================

-- Criar tenant default
INSERT INTO public.tenants (id, nome, tipo, plano, ativo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ambiente Teste', 'outro', 'trial', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FASE 3: PROFILES.tenant_id
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- Vincular usuários existentes ao tenant default como admin
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT user_id, '00000000-0000-0000-0000-000000000001'::uuid, 'admin'::public.app_role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- FASE 4: FUNÇÕES SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    (SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.get_user_tenant_id(_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- =====================================================
-- FASE 5: RLS POLICIES PARA TENANTS E USER_ROLES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view own tenant" ON public.tenants;
CREATE POLICY "Admins can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can update own tenant" ON public.tenants;
CREATE POLICY "Admins can update own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
CREATE POLICY "Admins can insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage tenant roles" ON public.user_roles;
CREATE POLICY "Admins can manage tenant roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- Trigger updated_at em tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FASE 6: ADICIONAR tenant_id EM TABELAS DE NEGÓCIO
-- =====================================================

DO $$
DECLARE
  t TEXT;
  business_tables TEXT[] := ARRAY[
    'clients','prospects','contacts','deals','deal_stages','activities',
    'crm_tasks','tags','client_tags','credit_analysis','credit_analysis_socios',
    'credit_analysis_sacados','credit_analysis_attachments','credit_analysis_insights',
    'credit_committee','committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','monitored_invoices','monitoring_groups',
    'monitoring_group_clients','patrimonial_info','integration_configs',
    'system_settings','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY business_tables LOOP
    -- Adiciona coluna se não existir
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE', t);
    -- Migra existentes para tenant default
    EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL', t);
    -- NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    -- Default para novos inserts
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
    -- Índice
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id)', t, t);
  END LOOP;
END $$;

-- =====================================================
-- FASE 7: TRIGGER AUTO-PREENCHIMENTO DE tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
    v_tenant := public.get_user_tenant_id(auth.uid());
    IF v_tenant IS NOT NULL THEN
      NEW.tenant_id := v_tenant;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
  business_tables TEXT[] := ARRAY[
    'clients','prospects','contacts','deals','deal_stages','activities',
    'crm_tasks','tags','client_tags','credit_analysis','credit_analysis_socios',
    'credit_analysis_sacados','credit_analysis_attachments','credit_analysis_insights',
    'credit_committee','committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','monitored_invoices','monitoring_groups',
    'monitoring_group_clients','patrimonial_info','integration_configs',
    'system_settings','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY business_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id_trigger BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user()', t);
  END LOOP;
END $$;

-- =====================================================
-- FASE 8: ATUALIZAR handle_new_user PARA VINCULAR TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_tenant UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (user_id, full_name, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), v_default_tenant);

  -- Vincula como leitor por padrão (admin precisa elevar manualmente)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, v_default_tenant, 'leitor'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;-- =====================================================
-- Helper: drop all existing policies on a table
-- =====================================================
CREATE OR REPLACE FUNCTION public._drop_all_policies(_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, _table);
  END LOOP;
END $$;

-- =====================================================
-- TENANTS — refazer policies (já criadas na fase anterior, mas garantindo)
-- =====================================================
SELECT public._drop_all_policies('tenants');

CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant_update_admin" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

CREATE POLICY "tenant_insert_admin" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================
-- USER_ROLES
-- =====================================================
SELECT public._drop_all_policies('user_roles');

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  );

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- PROFILES (mantém suas, apenas garantir tenant)
-- =====================================================
SELECT public._drop_all_policies('profiles');

CREATE POLICY "profiles_select_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CLIENTS — admin/analista CRUD; comite/leitor SELECT
-- =====================================================
SELECT public._drop_all_policies('clients');

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- PROSPECTS — admin/analista CRUD
-- =====================================================
SELECT public._drop_all_policies('prospects');

CREATE POLICY "prospects_select" ON public.prospects
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "prospects_insert" ON public.prospects
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "prospects_update" ON public.prospects
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "prospects_delete" ON public.prospects
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- CONTACTS, DEALS, DEAL_STAGES, ACTIVITIES, CRM_TASKS, TAGS, CLIENT_TAGS
-- (admin/analista CRUD; outros SELECT)
-- =====================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['contacts','deals','deal_stages','activities','crm_tasks','tags','client_tags',
                         'monitored_invoices','monitoring_groups','monitoring_group_clients','patrimonial_info'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_insert" ON public.%1$I
        FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_update" ON public.%1$I
        FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_delete" ON public.%1$I
        FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- CREDIT_ANALYSIS + filhas (socios, sacados, attachments, insights)
-- admin/analista CRUD; comite/leitor SELECT
-- =====================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['credit_analysis','credit_analysis_socios','credit_analysis_sacados',
                         'credit_analysis_attachments','credit_analysis_insights'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_insert" ON public.%1$I
        FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_update" ON public.%1$I
        FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_delete" ON public.%1$I
        FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- CREDIT_COMMITTEE — admin + comite votam; analista cria/lê; leitor lê
-- =====================================================
SELECT public._drop_all_policies('credit_committee');

CREATE POLICY "committee_select" ON public.credit_committee
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "committee_insert" ON public.credit_committee
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "committee_update" ON public.credit_committee
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "committee_delete" ON public.credit_committee
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- COMMITTEE_RESULT — admin + comite criam/editam; demais leem
-- =====================================================
SELECT public._drop_all_policies('committee_result');

CREATE POLICY "result_select" ON public.committee_result
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "result_insert" ON public.committee_result
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "result_update" ON public.committee_result
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "result_delete" ON public.committee_result
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- CREDIT_ENGINE_RULES — apenas admin altera; demais leem
-- =====================================================
SELECT public._drop_all_policies('credit_engine_rules');

CREATE POLICY "rules_select" ON public.credit_engine_rules
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "rules_admin_all" ON public.credit_engine_rules
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- BLACKLIST e BANKRUPTCY_RECORDS — apenas admin gerencia; demais leem
-- =====================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['blacklist','bankruptcy_records'] LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_admin_all" ON public.%1$I
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
        WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- INTEGRATION_CONFIGS — apenas admin acessa; analista lê; comite/leitor não
-- =====================================================
SELECT public._drop_all_policies('integration_configs');

CREATE POLICY "integration_select" ON public.integration_configs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "integration_admin_all" ON public.integration_configs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- SYSTEM_SETTINGS — apenas admin altera; demais leem
-- =====================================================
SELECT public._drop_all_policies('system_settings');

CREATE POLICY "settings_select" ON public.system_settings
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "settings_admin_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- AUDIT_LOG — imutável; SELECT e INSERT permitidos no tenant; sem UPDATE/DELETE
-- =====================================================
SELECT public._drop_all_policies('audit_log');

CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
-- sem policies de UPDATE/DELETE = bloqueado para usuários (apenas service_role bypass)

-- =====================================================
-- ÍNDICES COMPOSTOS para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_tenant_doc ON public.clients(tenant_id, cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_credit_analysis_tenant_client ON public.credit_analysis(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_credit_analysis_tenant_status ON public.credit_analysis(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_client ON public.deals(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON public.deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_client ON public.activities(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_status ON public.crm_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prospects_tenant_doc ON public.prospects(tenant_id, documento);
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_doc ON public.blacklist(tenant_id, documento);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_table ON public.audit_log(tenant_id, table_name);

-- =====================================================
-- STORAGE — bucket analysis-attachments isolado por tenant
-- Path convention: {tenant_id}/{analysis_id}/{filename}
-- =====================================================
DROP POLICY IF EXISTS "analysis_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_delete" ON storage.objects;

CREATE POLICY "analysis_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );

CREATE POLICY "analysis_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "analysis_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "analysis_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND public.is_admin(auth.uid())
  );

-- Bucket privado (já existe public=true; tornar privado para reforçar)
UPDATE storage.buckets SET public = false WHERE id = 'analysis-attachments';

-- =====================================================
-- Cleanup helper (só para uso interno, dropar após)
-- =====================================================
DROP FUNCTION public._drop_all_policies(TEXT);-- Helpers usados em RLS: precisam ser executáveis por authenticated
REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Funções internas (apenas sistema/triggers): bloquear chamadas via API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id_from_user() FROM PUBLIC, anon, authenticated;-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.bureau_provider_type AS ENUM
    ('serasa','boavista','spc','quod','assertiva','bigdatacorp','mock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bureau_consulta_status AS ENUM
    ('sucesso','erro','timeout','sem_dados');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- bureau_providers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bureau_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  provider_type public.bureau_provider_type NOT NULL,
  nome TEXT NOT NULL,
  -- credenciais NÃO ficam aqui em texto puro:
  -- guardamos apenas o NOME do secret (env var) que contém o token/cert/base_url
  credential_secret_name TEXT,
  base_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INT NOT NULL DEFAULT 100,
  tipos_consulta TEXT[] NOT NULL DEFAULT ARRAY['score']::TEXT[],
  custo_medio_consulta NUMERIC(10,4),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bureau_providers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bureau_providers_tenant_active
  ON public.bureau_providers(tenant_id, ativo, prioridade);

DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.bureau_providers;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.bureau_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS update_bureau_providers_updated_at ON public.bureau_providers;
CREATE TRIGGER update_bureau_providers_updated_at
  BEFORE UPDATE ON public.bureau_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: admin do tenant gerencia; analista lê (precisa saber quais bureaus existem)
CREATE POLICY "providers_select" ON public.bureau_providers
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "providers_admin_all" ON public.bureau_providers
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- bureau_consultas (cache + histórico)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bureau_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  documento TEXT NOT NULL,
  tipo_consulta TEXT NOT NULL,
  provider_id UUID REFERENCES public.bureau_providers(id) ON DELETE SET NULL,
  provider_type public.bureau_provider_type,
  response_raw JSONB,
  response_normalized JSONB,
  status public.bureau_consulta_status NOT NULL,
  error_message TEXT,
  custo_estimado NUMERIC(10,4),
  consultado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  validade_ate TIMESTAMPTZ
);

ALTER TABLE public.bureau_consultas ENABLE ROW LEVEL SECURITY;

-- Índice principal: cache hit
CREATE INDEX IF NOT EXISTS idx_bureau_consultas_cache
  ON public.bureau_consultas(tenant_id, documento, tipo_consulta, validade_ate DESC);
CREATE INDEX IF NOT EXISTS idx_bureau_consultas_tenant_data
  ON public.bureau_consultas(tenant_id, consultado_em DESC);

DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.bureau_consultas;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.bureau_consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- RLS: todos do tenant leem; admin/analista inserem; sem update/delete (histórico imutável)
CREATE POLICY "consultas_select" ON public.bureau_consultas
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "consultas_insert" ON public.bureau_consultas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

-- =====================================================
-- TTL defaults em system_settings
-- =====================================================
INSERT INTO public.system_settings (tenant_id, key, value, category, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'bureau_cache_ttl_days',
  '{"score":30,"protestos":7,"acoes_judiciais":30,"restritivos":7,"pendencias_financeiras":7,"consultas_recentes":1}'::jsonb,
  'bureau',
  'TTL (em dias) do cache de consultas a bureaus por tipo'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Mock provider default no tenant de teste
-- =====================================================
INSERT INTO public.bureau_providers (tenant_id, provider_type, nome, ativo, prioridade, tipos_consulta, custo_medio_consulta, observacoes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'mock',
  'Mock Bureau (Demonstração)',
  true,
  999,
  ARRAY['score','protestos','acoes_judiciais','restritivos','pendencias_financeiras','consultas_recentes'],
  0,
  'Provider sintético determinístico para desenvolvimento e demos. Não usar em produção.'
)
ON CONFLICT DO NOTHING;-- ==========================================
-- PARTE 1: Drop legacy permissive storage policies
-- ==========================================
DROP POLICY IF EXISTS "Allow all reads from analysis-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes from analysis-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to analysis-attachments" ON storage.objects;

-- ==========================================
-- PARTE 2: Schema p/ monitoring scheduling
-- ==========================================
ALTER TABLE public.monitoring_groups
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ DEFAULT now();

-- Índice para o seletor do runner (active + due)
CREATE INDEX IF NOT EXISTS idx_monitoring_groups_due
  ON public.monitoring_groups (next_run_at)
  WHERE is_active = true;

-- Índice de tenant para activities (usado pelo runner ao registrar alertas)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_client
  ON public.activities (tenant_id, client_id);

-- Habilita extensions de cron/http (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;-- ============================================================
-- PARTE 1: Triggers BEFORE INSERT para set_tenant_id_from_user
-- Aplicado a TODAS as 30 tabelas que possuem coluna tenant_id
-- (inclusive profiles e user_roles — são idempotentes pois a função
--  só preenche se NEW.tenant_id IS NULL)
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'activities','audit_log','bankruptcy_records','blacklist',
    'bureau_consultas','bureau_providers','client_tags','clients',
    'committee_result','contacts','credit_analysis',
    'credit_analysis_attachments','credit_analysis_insights',
    'credit_analysis_sacados','credit_analysis_socios',
    'credit_committee','credit_engine_rules','crm_tasks',
    'deal_stages','deals','integration_configs','monitored_invoices',
    'monitoring_group_clients','monitoring_groups','patrimonial_info',
    'prospects','system_settings','tags'
    -- Excluídos: profiles e user_roles — tenant_id é setado por handle_new_user
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON public.%I;
       CREATE TRIGGER set_tenant_id_before_insert
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- PARTE 2a: Atualizar audit_trigger_fn para popular changed_by_email (M9)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_tenant UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    BEGIN v_tenant := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, new_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, NEW.id::text, 'insert', to_jsonb(NEW), auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN v_tenant := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, old_data, new_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, NEW.id::text, 'update', to_jsonb(OLD), to_jsonb(NEW),
       auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    BEGIN v_tenant := (to_jsonb(OLD) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, old_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, OLD.id::text, 'delete', to_jsonb(OLD), auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- ============================================================
-- PARTE 2b: Anexar audit_trigger_fn em tabelas críticas
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'clients','prospects','credit_analysis','credit_committee',
    'committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','bureau_providers','user_roles',
    'tenants','integration_configs','system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      t, t
    );
  END LOOP;
END $$;DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'activities','audit_log','bankruptcy_records','blacklist',
    'bureau_consultas','bureau_providers','client_tags','clients',
    'committee_result','contacts','credit_analysis',
    'credit_analysis_attachments','credit_analysis_insights',
    'credit_analysis_sacados','credit_analysis_socios',
    'credit_committee','credit_engine_rules','crm_tasks',
    'deal_stages','deals','integration_configs','monitored_invoices',
    'monitoring_group_clients','monitoring_groups','patrimonial_info',
    'prospects','system_settings','tags'
  ];
  audit_tables TEXT[] := ARRAY[
    'clients','prospects','credit_analysis','credit_committee',
    'committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','bureau_providers','user_roles',
    'tenants','integration_configs','system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON public.%I;', t);
  END LOOP;
  FOREACH t IN ARRAY audit_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I;', t);
  END LOOP;
END $$;DO $$
DECLARE
  t TEXT;
  faltando TEXT[] := ARRAY[
    'clients','prospects','credit_committee','bankruptcy_records',
    'bureau_providers','user_roles','tenants','integration_configs'
  ];
BEGIN
  FOREACH t IN ARRAY faltando LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      t, t
    );
  END LOOP;
END $$;-- ============================================================
-- PARTE 1: ON DELETE CASCADE -> RESTRICT em FKs sensíveis
-- ============================================================

-- Helper inline: drop + recreate com mesmo nome (apenas troca on_delete)
DO $$
DECLARE
  rec RECORD;
  fks_tenant TEXT[][] := ARRAY[
    -- [tabela, coluna, constraint_name]
    ['activities','tenant_id','activities_tenant_id_fkey'],
    ['audit_log','tenant_id','audit_log_tenant_id_fkey'],
    ['bankruptcy_records','tenant_id','bankruptcy_records_tenant_id_fkey'],
    ['blacklist','tenant_id','blacklist_tenant_id_fkey'],
    ['bureau_consultas','tenant_id','bureau_consultas_tenant_id_fkey'],
    ['bureau_providers','tenant_id','bureau_providers_tenant_id_fkey'],
    ['client_tags','tenant_id','client_tags_tenant_id_fkey'],
    ['clients','tenant_id','clients_tenant_id_fkey'],
    ['committee_result','tenant_id','committee_result_tenant_id_fkey'],
    ['contacts','tenant_id','contacts_tenant_id_fkey'],
    ['credit_analysis','tenant_id','credit_analysis_tenant_id_fkey'],
    ['credit_analysis_attachments','tenant_id','credit_analysis_attachments_tenant_id_fkey'],
    ['credit_analysis_insights','tenant_id','credit_analysis_insights_tenant_id_fkey'],
    ['credit_analysis_sacados','tenant_id','credit_analysis_sacados_tenant_id_fkey'],
    ['credit_analysis_socios','tenant_id','credit_analysis_socios_tenant_id_fkey'],
    ['credit_committee','tenant_id','credit_committee_tenant_id_fkey'],
    ['credit_engine_rules','tenant_id','credit_engine_rules_tenant_id_fkey'],
    ['crm_tasks','tenant_id','crm_tasks_tenant_id_fkey'],
    ['deal_stages','tenant_id','deal_stages_tenant_id_fkey'],
    ['deals','tenant_id','deals_tenant_id_fkey'],
    ['integration_configs','tenant_id','integration_configs_tenant_id_fkey'],
    ['monitored_invoices','tenant_id','monitored_invoices_tenant_id_fkey'],
    ['monitoring_group_clients','tenant_id','monitoring_group_clients_tenant_id_fkey'],
    ['monitoring_groups','tenant_id','monitoring_groups_tenant_id_fkey'],
    ['patrimonial_info','tenant_id','patrimonial_info_tenant_id_fkey'],
    ['prospects','tenant_id','prospects_tenant_id_fkey'],
    ['system_settings','tenant_id','system_settings_tenant_id_fkey'],
    ['tags','tenant_id','tags_tenant_id_fkey'],
    ['user_roles','tenant_id','user_roles_tenant_id_fkey']
    -- profiles.tenant_id mantido SET NULL (decisão consciente)
  ];
  fks_clients TEXT[][] := ARRAY[
    ['credit_analysis','client_id','credit_analysis_client_id_fkey'],
    ['deals','client_id','deals_client_id_fkey'],
    ['patrimonial_info','client_id','patrimonial_info_client_id_fkey'],
    ['monitored_invoices','client_id','monitored_invoices_client_id_fkey'],
    ['contacts','client_id','contacts_client_id_fkey']
  ];
  i INT;
BEGIN
  -- tenant_id -> RESTRICT
  FOR i IN 1..array_length(fks_tenant, 1) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;
       ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.tenants(id) ON DELETE RESTRICT;',
      fks_tenant[i][1], fks_tenant[i][3],
      fks_tenant[i][1], fks_tenant[i][3], fks_tenant[i][2]
    );
  END LOOP;

  -- client_id -> RESTRICT
  FOR i IN 1..array_length(fks_clients, 1) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;
       ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.clients(id) ON DELETE RESTRICT;',
      fks_clients[i][1], fks_clients[i][3],
      fks_clients[i][1], fks_clients[i][3], fks_clients[i][2]
    );
  END LOOP;
END $$;

-- ============================================================
-- PARTE 2: Padronizar nomes de triggers de audit -> audit_changes
-- ============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.relname AS tbl, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname='public' AND NOT t.tgisinternal
      AND p.proname='audit_trigger_fn'
      AND t.tgname <> 'audit_changes'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', rec.tgname, rec.tbl);
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      rec.tbl, rec.tbl
    );
  END LOOP;
END $$;-- Trigger: ao mudar status de análise para approved/approved_restricted, gerar crm_tasks
CREATE OR REPLACE FUNCTION public.auto_create_task_on_credit_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name text;
BEGIN
  -- Apenas em mudança de status
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT razao_social INTO v_client_name FROM public.clients WHERE id = NEW.client_id;

    IF NEW.status IN ('approved', 'approved_restricted') THEN
      -- Tarefa de follow-up comercial em 7 dias
      INSERT INTO public.crm_tasks (
        tenant_id, client_id, title, description, due_date, priority, status, assigned_to
      ) VALUES (
        NEW.tenant_id,
        NEW.client_id,
        'Follow-up comercial pós-aprovação — ' || COALESCE(v_client_name, 'cliente'),
        CASE WHEN NEW.status = 'approved'
             THEN 'Crédito aprovado. Avançar oportunidade no funil e contatar o cliente para formalizar a operação.'
             ELSE 'Crédito aprovado COM RESTRIÇÃO. Validar condições especiais antes de operar.'
        END,
        now() + interval '7 days',
        CASE WHEN NEW.status = 'approved_restricted' THEN 'high' ELSE 'medium' END,
        'pending',
        NEW.responsavel_comercial
      );

      -- Restrição: tarefa adicional de revisão em 30d
      IF NEW.status = 'approved_restricted' THEN
        INSERT INTO public.crm_tasks (
          tenant_id, client_id, title, description, due_date, priority, status, assigned_to
        ) VALUES (
          NEW.tenant_id,
          NEW.client_id,
          'Revisar restrição de crédito — ' || COALESCE(v_client_name, 'cliente'),
          'Análise aprovada com restrição há 30 dias. Reavaliar condições, comportamento e indicadores.',
          now() + interval '30 days',
          'high',
          'pending',
          NEW.analista_credito
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_task_on_credit_decision ON public.credit_analysis;
CREATE TRIGGER trg_auto_task_on_credit_decision
AFTER UPDATE ON public.credit_analysis
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_task_on_credit_decision();