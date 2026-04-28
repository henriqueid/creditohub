-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.bureau_provider_type AS ENUM
    ('serasa','boavista','spc','quod','assertiva','bigdatacorp','mock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.bureau_consulta_status AS ENUM
    ('sucesso','erro','timeout','sem_dados');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- bureau_providers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bureau_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  provider_type public.bureau_provider_type NOT NULL,
  nome TEXT NOT NULL,
  -- credenciais NÃO ficam aqui em texto puro:
  -- guardamos apenas o NOME do secret (env var) que contém o token/cert/base_url
  credential_secret_name TEXT,
  base_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  prioridade INT NOT NULL DEFAULT 100,
  tipos_consulta TEXT[] NOT NULL DEFAULT ARRAY['score']::TEXT[],
  custo_medio_consulta NUMERIC(10,4),
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bureau_providers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bureau_providers_tenant_active
  ON public.bureau_providers(tenant_id, ativo, prioridade);

DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.bureau_providers;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.bureau_providers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

DROP TRIGGER IF EXISTS update_bureau_providers_updated_at ON public.bureau_providers;
CREATE TRIGGER update_bureau_providers_updated_at
  BEFORE UPDATE ON public.bureau_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: admin do tenant gerencia; analista lê (precisa saber quais bureaus existem)
CREATE POLICY "providers_select" ON public.bureau_providers
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "providers_admin_all" ON public.bureau_providers
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));

-- =====================================================
-- bureau_consultas (cache + histórico)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bureau_consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE
    DEFAULT '00000000-0000-0000-0000-000000000001',
  documento TEXT NOT NULL,
  tipo_consulta TEXT NOT NULL,
  provider_id UUID REFERENCES public.bureau_providers(id) ON DELETE SET NULL,
  provider_type public.bureau_provider_type,
  response_raw JSONB,
  response_normalized JSONB,
  status public.bureau_consulta_status NOT NULL,
  error_message TEXT,
  custo_estimado NUMERIC(10,4),
  consultado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  consultado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  validade_ate TIMESTAMPTZ
);

ALTER TABLE public.bureau_consultas ENABLE ROW LEVEL SECURITY;

-- Índice principal: cache hit
CREATE INDEX IF NOT EXISTS idx_bureau_consultas_cache
  ON public.bureau_consultas(tenant_id, documento, tipo_consulta, validade_ate DESC);
CREATE INDEX IF NOT EXISTS idx_bureau_consultas_tenant_data
  ON public.bureau_consultas(tenant_id, consultado_em DESC);

DROP TRIGGER IF EXISTS set_tenant_id_trigger ON public.bureau_consultas;
CREATE TRIGGER set_tenant_id_trigger
  BEFORE INSERT ON public.bureau_consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- RLS: todos do tenant leem; admin/analista inserem; sem update/delete (histórico imutável)
CREATE POLICY "consultas_select" ON public.bureau_consultas
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "consultas_insert" ON public.bureau_consultas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

-- =====================================================
-- TTL defaults em system_settings
-- =====================================================
INSERT INTO public.system_settings (tenant_id, key, value, category, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'bureau_cache_ttl_days',
  '{"score":30,"protestos":7,"acoes_judiciais":30,"restritivos":7,"pendencias_financeiras":7,"consultas_recentes":1}'::jsonb,
  'bureau',
  'TTL (em dias) do cache de consultas a bureaus por tipo'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- Mock provider default no tenant de teste
-- =====================================================
INSERT INTO public.bureau_providers (tenant_id, provider_type, nome, ativo, prioridade, tipos_consulta, custo_medio_consulta, observacoes)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'mock',
  'Mock Bureau (Demonstração)',
  true,
  999,
  ARRAY['score','protestos','acoes_judiciais','restritivos','pendencias_financeiras','consultas_recentes'],
  0,
  'Provider sintético determinístico para desenvolvimento e demos. Não usar em produção.'
)
ON CONFLICT DO NOTHING;