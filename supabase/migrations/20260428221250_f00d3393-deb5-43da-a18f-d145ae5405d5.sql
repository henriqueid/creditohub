-- ============================================================
-- PARTE 1: Triggers BEFORE INSERT para set_tenant_id_from_user
-- Aplicado a TODAS as 30 tabelas que possuem coluna tenant_id
-- (inclusive profiles e user_roles — são idempotentes pois a função
--  só preenche se NEW.tenant_id IS NULL)
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'activities','audit_log','bankruptcy_records','blacklist',
    'bureau_consultas','bureau_providers','client_tags','clients',
    'committee_result','contacts','credit_analysis',
    'credit_analysis_attachments','credit_analysis_insights',
    'credit_analysis_sacados','credit_analysis_socios',
    'credit_committee','credit_engine_rules','crm_tasks',
    'deal_stages','deals','integration_configs','monitored_invoices',
    'monitoring_group_clients','monitoring_groups','patrimonial_info',
    'prospects','system_settings','tags'
    -- Excluídos: profiles e user_roles — tenant_id é setado por handle_new_user
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON public.%I;
       CREATE TRIGGER set_tenant_id_before_insert
         BEFORE INSERT ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();',
      t, t
    );
  END LOOP;
END $$;

-- ============================================================
-- PARTE 2a: Atualizar audit_trigger_fn para popular changed_by_email (M9)
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email TEXT;
  v_tenant UUID;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    BEGIN v_tenant := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, new_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, NEW.id::text, 'insert', to_jsonb(NEW), auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    BEGIN v_tenant := (to_jsonb(NEW) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, old_data, new_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, NEW.id::text, 'update', to_jsonb(OLD), to_jsonb(NEW),
       auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    BEGIN v_tenant := (to_jsonb(OLD) ->> 'tenant_id')::uuid;
    EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;

    INSERT INTO public.audit_log
      (table_name, record_id, action, old_data, changed_by, changed_by_email, tenant_id)
    VALUES
      (TG_TABLE_NAME, OLD.id::text, 'delete', to_jsonb(OLD), auth.uid(), v_email,
       COALESCE(v_tenant, '00000000-0000-0000-0000-000000000001'::uuid));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- ============================================================
-- PARTE 2b: Anexar audit_trigger_fn em tabelas críticas
-- ============================================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'clients','prospects','credit_analysis','credit_committee',
    'committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','bureau_providers','user_roles',
    'tenants','integration_configs','system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      t, t
    );
  END LOOP;
END $$;