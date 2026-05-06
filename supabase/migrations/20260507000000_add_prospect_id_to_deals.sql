-- Rastreabilidade: deal sabe de qual prospect veio (se veio)
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_prospect_id ON public.deals(prospect_id);

-- Análise sabe se foi originada de prospect
ALTER TABLE public.credit_analysis
  ADD COLUMN IF NOT EXISTS prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_credit_analysis_prospect_id ON public.credit_analysis(prospect_id);
