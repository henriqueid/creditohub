DO $$
DECLARE
  t TEXT;
  faltando TEXT[] := ARRAY[
    'clients','prospects','credit_committee','bankruptcy_records',
    'bureau_providers','user_roles','tenants','integration_configs'
  ];
BEGIN
  FOREACH t IN ARRAY faltando LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS audit_changes ON public.%I;
       CREATE TRIGGER audit_changes
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();',
      t, t
    );
  END LOOP;
END $$;