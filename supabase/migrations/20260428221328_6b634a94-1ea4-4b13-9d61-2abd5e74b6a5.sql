DO $$
DECLARE
  t TEXT;
  tenant_tables TEXT[] := ARRAY[
    'activities','audit_log','bankruptcy_records','blacklist',
    'bureau_consultas','bureau_providers','client_tags','clients',
    'committee_result','contacts','credit_analysis',
    'credit_analysis_attachments','credit_analysis_insights',
    'credit_analysis_sacados','credit_analysis_socios',
    'credit_committee','credit_engine_rules','crm_tasks',
    'deal_stages','deals','integration_configs','monitored_invoices',
    'monitoring_group_clients','monitoring_groups','patrimonial_info',
    'prospects','system_settings','tags'
  ];
  audit_tables TEXT[] := ARRAY[
    'clients','prospects','credit_analysis','credit_committee',
    'committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','bureau_providers','user_roles',
    'tenants','integration_configs','system_settings'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON public.%I;', t);
  END LOOP;
  FOREACH t IN ARRAY audit_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_changes ON public.%I;', t);
  END LOOP;
END $$;