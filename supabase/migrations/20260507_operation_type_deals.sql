-- =====================================================
-- Adiciona operation_type em deals (modalidade comercial)
-- =====================================================
-- Captura a modalidade no cadastro de oportunidade
-- (antes mesmo da análise de crédito definir modalidade_operacao).
-- Texto livre — frontend valida com select de opções padrão,
-- mas o banco aceita qualquer string pra flexibilidade.

BEGIN;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS operation_type TEXT;

COMMENT ON COLUMN public.deals.operation_type IS
  'Modalidade comercial pretendida. Ex: Antecipacao de recebiveis, Desconto de duplicatas, Compra de recebiveis, FIDC, Outro.';

CREATE INDEX IF NOT EXISTS idx_deals_operation_type
  ON public.deals (operation_type)
  WHERE operation_type IS NOT NULL;

COMMIT;
