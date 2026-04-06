
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
