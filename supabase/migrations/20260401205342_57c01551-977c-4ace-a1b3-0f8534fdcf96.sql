
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
