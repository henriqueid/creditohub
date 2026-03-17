
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
