-- =====================================================================
-- Pacote 5a · Comitê profissional
-- =====================================================================
-- Objetivos:
--  1. Criar tabela `committee_members` (membership explícito por tenant).
--  2. Adicionar colunas `voter_id` e `is_locked` na tabela de votos
--     (`credit_committee` é a tabela de votos individuais — o frontend
--     se refere a ela conceitualmente como "committee_votes").
--  3. Adicionar colunas de override em `credit_analysis`.
--  4. Criar RPC `finalize_committee` que:
--      - calcula a decisão automática a partir dos votos atuais
--      - exige justificativa se override (final != calculado)
--      - trava todos os votos (is_locked = true)
--      - registra em audit_log
-- =====================================================================

BEGIN;

-- =====================================================================
-- 1. Tabela committee_members
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.committee_members (
  id          UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
              REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'voter'
              CHECK (role IN ('voter','chair','observer')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT committee_members_tenant_user_uniq UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_members_tenant_active
  ON public.committee_members (tenant_id, active);

CREATE INDEX IF NOT EXISTS idx_committee_members_tenant_id
  ON public.committee_members (tenant_id);

-- Trigger de auto-preenchimento do tenant_id
DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.committee_members;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.committee_members
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- RLS
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS committee_members_select ON public.committee_members;
DROP POLICY IF EXISTS committee_members_insert ON public.committee_members;
DROP POLICY IF EXISTS committee_members_update ON public.committee_members;
DROP POLICY IF EXISTS committee_members_delete ON public.committee_members;

CREATE POLICY committee_members_select ON public.committee_members
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY committee_members_insert ON public.committee_members
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

CREATE POLICY committee_members_update ON public.committee_members
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

CREATE POLICY committee_members_delete ON public.committee_members
  FOR DELETE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );


-- =====================================================================
-- 2. Colunas novas em credit_committee (tabela de votos)
-- =====================================================================
-- voter_id: rastreia o user que votou (texto member_name pré-existente
--           continua valendo para compatibilidade).
ALTER TABLE public.credit_committee
  ADD COLUMN IF NOT EXISTS voter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.credit_committee
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.credit_committee.is_locked IS
  'Voto travado quando comitê é finalizado. UPDATE em voto locked é bloqueado por policy.';

CREATE INDEX IF NOT EXISTS idx_credit_committee_voter_id
  ON public.credit_committee (voter_id);

-- Recriar policy de UPDATE com restrição de is_locked + voter_id
DROP POLICY IF EXISTS "committee_update" ON public.credit_committee;
DROP POLICY IF EXISTS committee_update ON public.credit_committee;

CREATE POLICY committee_update ON public.credit_committee
  FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND is_locked = false
    AND (
      voter_id = auth.uid()
      OR public.is_admin(auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND is_locked = false
  );


-- =====================================================================
-- 3. Colunas de override em credit_analysis
-- =====================================================================
ALTER TABLE public.credit_analysis
  ADD COLUMN IF NOT EXISTS committee_override_by      UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS committee_override_reason  TEXT,
  ADD COLUMN IF NOT EXISTS committee_override_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS committee_calculated_decision public.credit_status;

COMMENT ON COLUMN public.credit_analysis.committee_calculated_decision IS
  'Decisão original calculada pelos votos. Se diferente de status, houve override admin.';
COMMENT ON COLUMN public.credit_analysis.committee_override_by IS
  'Admin que aplicou override sobre a decisão calculada.';
COMMENT ON COLUMN public.credit_analysis.committee_override_reason IS
  'Justificativa obrigatória (validada na RPC) quando há override.';


-- =====================================================================
-- 4. RPC finalize_committee
-- =====================================================================
CREATE OR REPLACE FUNCTION public.finalize_committee(
  p_analysis_id      UUID,
  p_final_decision   public.credit_status,
  p_override_reason  TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller            UUID := auth.uid();
  v_tenant_id         UUID;
  v_analyst_id        UUID;
  v_total             INT;
  v_approve           INT;
  v_restrict          INT;
  v_reject            INT;
  v_calculated        public.credit_status;
  v_was_override      BOOLEAN;
  v_old_status        public.credit_status;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Carrega análise + verifica tenant + autoriza caller
  SELECT ca.tenant_id, ca.analista_credito, ca.status
    INTO v_tenant_id, v_analyst_id, v_old_status
  FROM public.credit_analysis ca
  WHERE ca.id = p_analysis_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Análise % não encontrada', p_analysis_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_tenant_id <> public.get_user_tenant_id(v_caller) THEN
    RAISE EXCEPTION 'Acesso negado: análise pertence a outro tenant'
      USING ERRCODE = '42501';
  END IF;

  -- Caller autorizado: admin OU analista_credito da análise
  IF NOT (
    public.is_admin(v_caller)
    OR (v_analyst_id IS NOT NULL AND v_analyst_id = v_caller)
  ) THEN
    RAISE EXCEPTION 'Apenas admin ou o analista responsável podem finalizar o comitê'
      USING ERRCODE = '42501';
  END IF;

  IF p_final_decision NOT IN ('approved','approved_restricted','rejected') THEN
    RAISE EXCEPTION 'Decisão final inválida: %. Use approved, approved_restricted ou rejected.', p_final_decision
      USING ERRCODE = '22023';
  END IF;

  -- Calcula decisão automática a partir dos votos
  SELECT
    COUNT(*)                                      ,
    COUNT(*) FILTER (WHERE vote = 'approve')      ,
    COUNT(*) FILTER (WHERE vote = 'restrict')     ,
    COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_total, v_approve, v_restrict, v_reject
  FROM public.credit_committee
  WHERE credit_analysis_id = p_analysis_id;

  IF v_total = 0 THEN
    RAISE EXCEPTION 'Não há votos registrados para esta análise'
      USING ERRCODE = 'P0001';
  END IF;

  -- Regra de cálculo:
  --   reject majoritário → rejected
  --   approve majoritário (sem restrict) → approved
  --   senão se há approve mas há restrict → approved_restricted
  --   restrict majoritário → approved_restricted
  --   empate sem approve → rejected (conservador)
  IF v_reject > v_approve AND v_reject >= v_restrict THEN
    v_calculated := 'rejected';
  ELSIF v_approve > v_restrict AND v_approve > v_reject AND v_restrict = 0 THEN
    v_calculated := 'approved';
  ELSIF v_approve + v_restrict > v_reject THEN
    v_calculated := 'approved_restricted';
  ELSE
    v_calculated := 'rejected';
  END IF;

  v_was_override := (p_final_decision <> v_calculated);

  -- Override exige justificativa não-vazia
  IF v_was_override AND (p_override_reason IS NULL OR length(btrim(p_override_reason)) = 0) THEN
    RAISE EXCEPTION 'Override requer justificativa (p_override_reason).'
      USING ERRCODE = 'P0001';
  END IF;

  -- Override só pode ser feito por admin
  IF v_was_override AND NOT public.is_admin(v_caller) THEN
    RAISE EXCEPTION 'Apenas admin pode aplicar override sobre a decisão calculada'
      USING ERRCODE = '42501';
  END IF;

  -- Trava todos os votos da análise
  UPDATE public.credit_committee
     SET is_locked = true
   WHERE credit_analysis_id = p_analysis_id;

  -- Atualiza credit_analysis
  UPDATE public.credit_analysis
     SET status                          = p_final_decision,
         committee_calculated_decision   = v_calculated,
         committee_override_by           = CASE WHEN v_was_override THEN v_caller ELSE NULL END,
         committee_override_reason       = CASE WHEN v_was_override THEN btrim(p_override_reason) ELSE NULL END,
         committee_override_at           = CASE WHEN v_was_override THEN now() ELSE NULL END,
         updated_at                      = now()
   WHERE id = p_analysis_id;

  -- Audit log (insere via SECURITY DEFINER bypass de policy)
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (
    'credit_analysis',
    p_analysis_id::text,
    'finalize_committee',
    jsonb_build_object('status', v_old_status),
    jsonb_build_object(
      'status',                p_final_decision,
      'calculated_decision',   v_calculated,
      'was_override',          v_was_override,
      'override_reason',       CASE WHEN v_was_override THEN btrim(p_override_reason) ELSE NULL END,
      'votes',                 jsonb_build_object(
                                  'total',    v_total,
                                  'approve',  v_approve,
                                  'restrict', v_restrict,
                                  'reject',   v_reject
                                )
    ),
    v_caller
  );

  RETURN json_build_object(
    'ok',          true,
    'was_override', v_was_override,
    'calculated',   v_calculated::text,
    'final',        p_final_decision::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_committee(UUID, public.credit_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_committee(UUID, public.credit_status, TEXT) TO authenticated;

COMMENT ON FUNCTION public.finalize_committee(UUID, public.credit_status, TEXT) IS
  'Finaliza o comitê de uma análise. Calcula decisão a partir dos votos, exige justificativa se override, trava votos e atualiza credit_analysis. Retorna {ok, was_override, calculated, final}.';

COMMIT;
