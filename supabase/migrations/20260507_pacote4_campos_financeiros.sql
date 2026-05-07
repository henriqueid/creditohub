-- =====================================================
-- PACOTE 4 · Estruturação de campos financeiros
-- =====================================================
-- Converte 3 colunas text -> numeric em credit_analysis e
-- cria credit_analysis_revenue (faturamento mensal estruturado).
--
-- NÃO inclui historico_pagamentos (tradeoff documentado, fica
-- pra migration futura — fora do escopo do Pacote 4).
-- =====================================================

BEGIN;

-- =====================================================
-- PARTE 1 · Converter campos text -> numeric
-- =====================================================
-- margem_liquida    : percentual em decimal (ex: 0.1234 = 12.34%)
-- indice_liquidez   : razão (ex: 1.2500)
-- endividamento     : percentual em decimal
--
-- Tratamento: NULLIF(col, '') trata strings vazias como NULL.
-- ATENÇÃO: se houver valores não-numéricos (ex: "12,34" ou "-"),
-- a conversão falha. Limpe os dados antes de rodar.

ALTER TABLE public.credit_analysis
  ALTER COLUMN margem_liquida TYPE numeric(8,4)
    USING NULLIF(margem_liquida, '')::numeric;

ALTER TABLE public.credit_analysis
  ALTER COLUMN indice_liquidez TYPE numeric(8,4)
    USING NULLIF(indice_liquidez, '')::numeric;

ALTER TABLE public.credit_analysis
  ALTER COLUMN endividamento TYPE numeric(8,4)
    USING NULLIF(endividamento, '')::numeric;

COMMENT ON COLUMN public.credit_analysis.margem_liquida
  IS 'Margem líquida em decimal (0.1234 = 12.34%). Range esperado: -1.0 a 1.0.';
COMMENT ON COLUMN public.credit_analysis.indice_liquidez
  IS 'Índice de liquidez corrente (ativo circulante / passivo circulante). Ex: 1.2500.';
COMMENT ON COLUMN public.credit_analysis.endividamento
  IS 'Endividamento total em decimal (0.4500 = 45%). Range esperado: 0.0 a ~5.0.';

-- =====================================================
-- PARTE 2 · Tabela credit_analysis_revenue
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credit_analysis_revenue (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
              REFERENCES public.tenants(id) ON DELETE CASCADE,
  year        int  NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month       int  NOT NULL CHECK (month >= 1 AND month <= 12),
  revenue     numeric(15,2) NOT NULL CHECK (revenue >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, year, month)
);

COMMENT ON TABLE public.credit_analysis_revenue
  IS 'Faturamento mensal estruturado por análise. Substitui parsing de string em CreditAnalysisForm.';

CREATE INDEX IF NOT EXISTS idx_credit_analysis_revenue_analysis_id
  ON public.credit_analysis_revenue(analysis_id);

CREATE INDEX IF NOT EXISTS idx_credit_analysis_revenue_tenant_id
  ON public.credit_analysis_revenue(tenant_id);

-- =====================================================
-- PARTE 3 · Trigger pra preencher tenant_id do parent
-- =====================================================
-- Diferente do set_tenant_id_from_user genérico: aqui o tenant_id
-- vem da credit_analysis pai, garantindo consistência referencial
-- (impede mismatch entre tenant da revenue e tenant da análise).
-- Fallback pra auth.uid() se parent não for encontrado.

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_credit_analysis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_tenant uuid;
BEGIN
  -- Sempre alinha com tenant do parent (sobrescreve se vier diferente)
  SELECT tenant_id INTO v_parent_tenant
  FROM public.credit_analysis
  WHERE id = NEW.analysis_id;

  IF v_parent_tenant IS NOT NULL THEN
    NEW.tenant_id := v_parent_tenant;
  ELSIF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.tenant_id := public.get_user_tenant_id(auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.credit_analysis_revenue;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.credit_analysis_revenue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_id_from_credit_analysis();

-- =====================================================
-- PARTE 4 · RLS — padrão da casa
-- =====================================================

ALTER TABLE public.credit_analysis_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_analysis_revenue_select ON public.credit_analysis_revenue;
CREATE POLICY credit_analysis_revenue_select ON public.credit_analysis_revenue
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS credit_analysis_revenue_insert ON public.credit_analysis_revenue;
CREATE POLICY credit_analysis_revenue_insert ON public.credit_analysis_revenue
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'analista')
    )
  );

DROP POLICY IF EXISTS credit_analysis_revenue_update ON public.credit_analysis_revenue;
CREATE POLICY credit_analysis_revenue_update ON public.credit_analysis_revenue
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'analista')
    )
  );

DROP POLICY IF EXISTS credit_analysis_revenue_delete ON public.credit_analysis_revenue;
CREATE POLICY credit_analysis_revenue_delete ON public.credit_analysis_revenue
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

COMMIT;

-- =====================================================
-- TRADEOFF DOCUMENTADO · historico_pagamentos
-- =====================================================
-- O campo credit_analysis.historico_pagamentos continua como
-- text (texto livre) NESTA migration. Estruturá-lo (ex: tabela
-- credit_analysis_payment_history com colunas data/valor/status)
-- fica como migration futura, fora do escopo do Pacote 4.
-- Motivo: requer definição de schema específico (parcelas?
-- inadimplências? notas?) e migração de dados legados.
-- =====================================================
