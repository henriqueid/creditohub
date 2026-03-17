
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
