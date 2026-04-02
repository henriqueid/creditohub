
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
