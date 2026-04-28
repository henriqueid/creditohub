-- =====================================================
-- FASE 1: ENUMS E TABELAS BASE
-- =====================================================

-- Enum de roles do app
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'analista', 'comite', 'leitor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum de tipo de tenant
DO $$ BEGIN
  CREATE TYPE public.tenant_type AS ENUM ('fidc', 'securitizadora', 'factoring', 'outro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enum de plano
DO $$ BEGIN
  CREATE TYPE public.tenant_plan AS ENUM ('essencial', 'profissional', 'avancado', 'trial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  tipo public.tenant_type NOT NULL DEFAULT 'outro',
  ativo BOOLEAN NOT NULL DEFAULT true,
  plano public.tenant_plan NOT NULL DEFAULT 'trial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);

-- =====================================================
-- FASE 2: TENANT DEFAULT + MIGRAÇÃO DE DADOS
-- =====================================================

-- Criar tenant default
INSERT INTO public.tenants (id, nome, tipo, plano, ativo)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ambiente Teste', 'outro', 'trial', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- FASE 3: PROFILES.tenant_id
-- =====================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);

-- Vincular usuários existentes ao tenant default como admin
INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT user_id, '00000000-0000-0000-0000-000000000001'::uuid, 'admin'::public.app_role
FROM public.profiles
WHERE user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- =====================================================
-- FASE 4: FUNÇÕES SECURITY DEFINER
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tenant_id FROM public.profiles WHERE user_id = _user_id LIMIT 1),
    (SELECT tenant_id FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND tenant_id = public.get_user_tenant_id(_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role);
$$;

-- =====================================================
-- FASE 5: RLS POLICIES PARA TENANTS E USER_ROLES
-- =====================================================

DROP POLICY IF EXISTS "Admins can view own tenant" ON public.tenants;
CREATE POLICY "Admins can view own tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can update own tenant" ON public.tenants;
CREATE POLICY "Admins can update own tenant" ON public.tenants
  FOR UPDATE TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
CREATE POLICY "Admins can insert tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "Admins can manage tenant roles" ON public.user_roles;
CREATE POLICY "Admins can manage tenant roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- Trigger updated_at em tenants
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FASE 6: ADICIONAR tenant_id EM TABELAS DE NEGÓCIO
-- =====================================================

DO $$
DECLARE
  t TEXT;
  business_tables TEXT[] := ARRAY[
    'clients','prospects','contacts','deals','deal_stages','activities',
    'crm_tasks','tags','client_tags','credit_analysis','credit_analysis_socios',
    'credit_analysis_sacados','credit_analysis_attachments','credit_analysis_insights',
    'credit_committee','committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','monitored_invoices','monitoring_groups',
    'monitoring_group_clients','patrimonial_info','integration_configs',
    'system_settings','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY business_tables LOOP
    -- Adiciona coluna se não existir
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE', t);
    -- Migra existentes para tenant default
    EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000001'' WHERE tenant_id IS NULL', t);
    -- NOT NULL
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
    -- Default para novos inserts
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT ''00000000-0000-0000-0000-000000000001''', t);
    -- Índice
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id)', t, t);
  END LOOP;
END $$;

-- =====================================================
-- FASE 7: TRIGGER AUTO-PREENCHIMENTO DE tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant UUID;
BEGIN
  IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
    v_tenant := public.get_user_tenant_id(auth.uid());
    IF v_tenant IS NOT NULL THEN
      NEW.tenant_id := v_tenant;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
  business_tables TEXT[] := ARRAY[
    'clients','prospects','contacts','deals','deal_stages','activities',
    'crm_tasks','tags','client_tags','credit_analysis','credit_analysis_socios',
    'credit_analysis_sacados','credit_analysis_attachments','credit_analysis_insights',
    'credit_committee','committee_result','credit_engine_rules','blacklist',
    'bankruptcy_records','monitored_invoices','monitoring_groups',
    'monitoring_group_clients','patrimonial_info','integration_configs',
    'system_settings','audit_log'
  ];
BEGIN
  FOREACH t IN ARRAY business_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id_trigger BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user()', t);
  END LOOP;
END $$;

-- =====================================================
-- FASE 8: ATUALIZAR handle_new_user PARA VINCULAR TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_tenant UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.profiles (user_id, full_name, tenant_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), v_default_tenant);

  -- Vincula como leitor por padrão (admin precisa elevar manualmente)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, v_default_tenant, 'leitor'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;