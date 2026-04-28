-- ============================================================
-- PARTE 1: ON DELETE CASCADE -> RESTRICT em FKs sensíveis
-- ============================================================

-- Helper inline: drop + recreate com mesmo nome (apenas troca on_delete)
DO $$
DECLARE
  rec RECORD;
  fks_tenant TEXT[][] := ARRAY[
    -- [tabela, coluna, constraint_name]
    ['activities','tenant_id','activities_tenant_id_fkey'],
    ['audit_log','tenant_id','audit_log_tenant_id_fkey'],
    ['bankruptcy_records','tenant_id','bankruptcy_records_tenant_id_fkey'],
    ['blacklist','tenant_id','blacklist_tenant_id_fkey'],
    ['bureau_consultas','tenant_id','bureau_consultas_tenant_id_fkey'],
    ['bureau_providers','tenant_id','bureau_providers_tenant_id_fkey'],
    ['client_tags','tenant_id','client_tags_tenant_id_fkey'],
    ['clients','tenant_id','clients_tenant_id_fkey'],
    ['committee_result','tenant_id','committee_result_tenant_id_fkey'],
    ['contacts','tenant_id','contacts_tenant_id_fkey'],
    ['credit_analysis','tenant_id','credit_analysis_tenant_id_fkey'],
    ['credit_analysis_attachments','tenant_id','credit_analysis_attachments_tenant_id_fkey'],
    ['credit_analysis_insights','tenant_id','credit_analysis_insights_tenant_id_fkey'],
    ['credit_analysis_sacados','tenant_id','credit_analysis_sacados_tenant_id_fkey'],
    ['credit_analysis_socios','tenant_id','credit_analysis_socios_tenant_id_fkey'],
    ['credit_committee','tenant_id','credit_committee_tenant_id_fkey'],
    ['credit_engine_rules','tenant_id','credit_engine_rules_tenant_id_fkey'],
    ['crm_tasks','tenant_id','crm_tasks_tenant_id_fkey'],
    ['deal_stages','tenant_id','deal_stages_tenant_id_fkey'],
    ['deals','tenant_id','deals_tenant_id_fkey'],
    ['integration_configs','tenant_id','integration_configs_tenant_id_fkey'],
    ['monitored_invoices','tenant_id','monitored_invoices_tenant_id_fkey'],
    ['monitoring_group_clients','tenant_id','monitoring_group_clients_tenant_id_fkey'],
    ['monitoring_groups','tenant_id','monitoring_groups_tenant_id_fkey'],
    ['patrimonial_info','tenant_id','patrimonial_info_tenant_id_fkey'],
    ['prospects','tenant_id','prospects_tenant_id_fkey'],
    ['system_settings','tenant_id','system_settings_tenant_id_fkey'],
    ['tags','tenant_id','tags_tenant_id_fkey'],
    ['user_roles','tenant_id','user_roles_tenant_id_fkey']
    -- profiles.tenant_id mantido SET NULL (decisão consciente)
  ];
  fks_clients TEXT[][] := ARRAY[
    ['credit_analysis','client_id','credit_analysis_client_id_fkey'],
    ['deals','client_id','deals_client_id_fkey'],
    ['patrimonial_info','client_id','patrimonial_info_client_id_fkey'],
    ['monitored_invoices','client_id','monitored_invoices_client_id_fkey'],
    ['contacts','client_id','contacts_client_id_fkey']
  ];
  i INT;
BEGIN
  -- tenant_id -> RESTRICT
  FOR i IN 1..array_length(fks_tenant, 1) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;
       ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.tenants(id) ON DELETE RESTRICT;',
      fks_tenant[i][1], fks_tenant[i][3],
      fks_tenant[i][1], fks_tenant[i][3], fks_tenant[i][2]
    );
  END LOOP;

  -- client_id -> RESTRICT
  FOR i IN 1..array_length(fks_clients, 1) LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;
       ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.clients(id) ON DELETE RESTRICT;',
      fks_clients[i][1], fks_clients[i][3],
      fks_clients[i][1], fks_clients[i][3], fks_clients[i][2]
    );
  END LOOP;
END $$;

-- ============================================================
-- PARTE 2: Padronizar nomes de triggers de audit -> audit_changes
-- ============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT c.relname AS tbl, t.tgname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE n.nspname='public' AND NOT t.tgisinternal
      AND p.proname='audit_trigger_fn'
      AND t.tgname <> 'audit_changes'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', rec.tgname, rec.tbl);
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      rec.tbl, rec.tbl
    );
  END LOOP;
END $$;