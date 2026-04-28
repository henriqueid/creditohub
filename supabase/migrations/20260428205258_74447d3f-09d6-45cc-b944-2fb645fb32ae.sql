-- =====================================================
-- Helper: drop all existing policies on a table
-- =====================================================
CREATE OR REPLACE FUNCTION public._drop_all_policies(_table TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=_table LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, _table);
  END LOOP;
END $$;

-- =====================================================
-- TENANTS — refazer policies (já criadas na fase anterior, mas garantindo)
-- =====================================================
SELECT public._drop_all_policies('tenants');

CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "tenant_update_admin" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

CREATE POLICY "tenant_insert_admin" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- =====================================================
-- USER_ROLES
-- =====================================================
SELECT public._drop_all_policies('user_roles');

CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  );

CREATE POLICY "user_roles_admin_manage" ON public.user_roles
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- PROFILES (mantém suas, apenas garantir tenant)
-- =====================================================
SELECT public._drop_all_policies('profiles');

CREATE POLICY "profiles_select_tenant" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CLIENTS — admin/analista CRUD; comite/leitor SELECT
-- =====================================================
SELECT public._drop_all_policies('clients');

CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- PROSPECTS — admin/analista CRUD
-- =====================================================
SELECT public._drop_all_policies('prospects');

CREATE POLICY "prospects_select" ON public.prospects
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "prospects_insert" ON public.prospects
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "prospects_update" ON public.prospects
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "prospects_delete" ON public.prospects
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- CONTACTS, DEALS, DEAL_STAGES, ACTIVITIES, CRM_TASKS, TAGS, CLIENT_TAGS
-- (admin/analista CRUD; outros SELECT)
-- =====================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['contacts','deals','deal_stages','activities','crm_tasks','tags','client_tags',
                         'monitored_invoices','monitoring_groups','monitoring_group_clients','patrimonial_info'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_insert" ON public.%1$I
        FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_update" ON public.%1$I
        FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_delete" ON public.%1$I
        FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- CREDIT_ANALYSIS + filhas (socios, sacados, attachments, insights)
-- admin/analista CRUD; comite/leitor SELECT
-- =====================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['credit_analysis','credit_analysis_socios','credit_analysis_sacados',
                         'credit_analysis_attachments','credit_analysis_insights'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_insert" ON public.%1$I
        FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_update" ON public.%1$I
        FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
          AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
      CREATE POLICY "%1$s_delete" ON public.%1$I
        FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- CREDIT_COMMITTEE — admin + comite votam; analista cria/lê; leitor lê
-- =====================================================
SELECT public._drop_all_policies('credit_committee');

CREATE POLICY "committee_select" ON public.credit_committee
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "committee_insert" ON public.credit_committee
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "committee_update" ON public.credit_committee
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "committee_delete" ON public.credit_committee
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- COMMITTEE_RESULT — admin + comite criam/editam; demais leem
-- =====================================================
SELECT public._drop_all_policies('committee_result');

CREATE POLICY "result_select" ON public.committee_result
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "result_insert" ON public.committee_result
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "result_update" ON public.committee_result
  FOR UPDATE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'comite')));
CREATE POLICY "result_delete" ON public.committee_result
  FOR DELETE TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- CREDIT_ENGINE_RULES — apenas admin altera; demais leem
-- =====================================================
SELECT public._drop_all_policies('credit_engine_rules');

CREATE POLICY "rules_select" ON public.credit_engine_rules
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "rules_admin_all" ON public.credit_engine_rules
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- BLACKLIST e BANKRUPTCY_RECORDS — apenas admin gerencia; demais leem
-- =====================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['blacklist','bankruptcy_records'] LOOP
    EXECUTE format('SELECT public._drop_all_policies(%L)', t);
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I
        FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
      CREATE POLICY "%1$s_admin_all" ON public.%1$I
        FOR ALL TO authenticated
        USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
        WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
    $f$, t);
  END LOOP;
END $$;

-- =====================================================
-- INTEGRATION_CONFIGS — apenas admin acessa; analista lê; comite/leitor não
-- =====================================================
SELECT public._drop_all_policies('integration_configs');

CREATE POLICY "integration_select" ON public.integration_configs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));
CREATE POLICY "integration_admin_all" ON public.integration_configs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- SYSTEM_SETTINGS — apenas admin altera; demais leem
-- =====================================================
SELECT public._drop_all_policies('system_settings');

CREATE POLICY "settings_select" ON public.system_settings
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "settings_admin_all" ON public.system_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- AUDIT_LOG — imutável; SELECT e INSERT permitidos no tenant; sem UPDATE/DELETE
-- =====================================================
SELECT public._drop_all_policies('audit_log');

CREATE POLICY "audit_select" ON public.audit_log
  FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id(auth.uid()));
CREATE POLICY "audit_insert" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));
-- sem policies de UPDATE/DELETE = bloqueado para usuários (apenas service_role bypass)

-- =====================================================
-- ÍNDICES COMPOSTOS para performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clients_tenant_doc ON public.clients(tenant_id, cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_credit_analysis_tenant_client ON public.credit_analysis(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_credit_analysis_tenant_status ON public.credit_analysis(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_client ON public.deals(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON public.deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant_client ON public.activities(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_tenant_status ON public.crm_tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_prospects_tenant_doc ON public.prospects(tenant_id, documento);
CREATE INDEX IF NOT EXISTS idx_blacklist_tenant_doc ON public.blacklist(tenant_id, documento);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_table ON public.audit_log(tenant_id, table_name);

-- =====================================================
-- STORAGE — bucket analysis-attachments isolado por tenant
-- Path convention: {tenant_id}/{analysis_id}/{filename}
-- =====================================================
DROP POLICY IF EXISTS "analysis_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "analysis_attachments_delete" ON storage.objects;

CREATE POLICY "analysis_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
  );

CREATE POLICY "analysis_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "analysis_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista'))
  );

CREATE POLICY "analysis_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'analysis-attachments'
    AND (storage.foldername(name))[1] = public.get_user_tenant_id(auth.uid())::text
    AND public.is_admin(auth.uid())
  );

-- Bucket privado (já existe public=true; tornar privado para reforçar)
UPDATE storage.buckets SET public = false WHERE id = 'analysis-attachments';

-- =====================================================
-- Cleanup helper (só para uso interno, dropar após)
-- =====================================================
DROP FUNCTION public._drop_all_policies(TEXT);