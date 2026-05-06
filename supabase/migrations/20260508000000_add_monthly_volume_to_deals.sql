-- Volume mensal estimado de operação do deal (separado do limite estimado).
-- Para factoring/FIDC: limite = cap de crédito; volume mensal = fluxo de operação esperado.
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS monthly_volume NUMERIC;
