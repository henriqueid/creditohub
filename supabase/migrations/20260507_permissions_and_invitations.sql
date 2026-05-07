-- =====================================================
-- Permissões configuráveis + convites + super-admin
-- =====================================================
-- 1. Adiciona role 'comercial' ao enum app_role
-- 2. Cria tabela tenant_role_permissions (matriz role x módulo por tenant)
-- 3. Cria tabela pending_invitations (convite por token)
-- 4. Adiciona profiles.is_super_admin (gerencia tenants)
-- 5. Seed de permissões default por role pra todos os tenants existentes
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Role 'comercial' no enum app_role
-- =====================================================
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'comercial';

COMMIT;

-- Necessário commit antes de usar o novo valor do enum em outras DDLs/inserts
BEGIN;

-- =====================================================
-- 2. Tabela tenant_role_permissions
-- =====================================================
-- Matriz role x módulo por tenant. Admin de cada tenant pode customizar.
-- Default: seed inicial cobre as 5 roles com sensible defaults.

CREATE TABLE IF NOT EXISTS public.tenant_role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role        public.app_role NOT NULL,
  module      TEXT NOT NULL,
  can_access  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, role, module)
);

CREATE INDEX IF NOT EXISTS idx_trp_tenant_role
  ON public.tenant_role_permissions (tenant_id, role);

ALTER TABLE public.tenant_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trp_select ON public.tenant_role_permissions;
CREATE POLICY trp_select ON public.tenant_role_permissions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS trp_admin_write ON public.tenant_role_permissions;
CREATE POLICY trp_admin_write ON public.tenant_role_permissions
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

COMMENT ON TABLE public.tenant_role_permissions IS
  'Matriz de permissões por role e módulo, customizável por tenant pelo admin.';

-- =====================================================
-- 3. Tabela pending_invitations
-- =====================================================
-- Admin gera token, envia link /auth?invite=TOKEN. Quando alguém aceita,
-- entra no tenant correto com a role pré-definida.

CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        public.app_role NOT NULL DEFAULT 'leitor',
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at     TIMESTAMPTZ,
  used_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_invitations_token
  ON public.pending_invitations (token) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pending_invitations_email
  ON public.pending_invitations (email);

ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admin do tenant gerencia convites do próprio tenant
DROP POLICY IF EXISTS pi_admin_all ON public.pending_invitations;
CREATE POLICY pi_admin_all ON public.pending_invitations
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  );

COMMENT ON TABLE public.pending_invitations IS
  'Convites de acesso. Token gera URL /auth?invite=TOKEN. Aceitação via RPC accept_invitation.';

-- =====================================================
-- 4. profiles.is_super_admin
-- =====================================================
-- Marca usuários que podem criar/gerenciar tenants (você).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_super_admin IS
  'Super-admin do CreditoHub (quem cria tenants e gerencia infra do SaaS).';

-- Função helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND is_super_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin(UUID) TO authenticated;

-- =====================================================
-- 5. Seed de permissões default por tenant existente
-- =====================================================
-- Módulos canônicos (11):
--   dashboard, consulta, prospects, cedentes, credito,
--   crm, relatorios, blacklist, audit_log, settings_geral, settings_equipe

CREATE OR REPLACE FUNCTION public.seed_default_permissions(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modulos TEXT[] := ARRAY[
    'dashboard', 'consulta', 'prospects', 'cedentes', 'credito',
    'crm', 'relatorios', 'blacklist', 'audit_log',
    'settings_geral', 'settings_equipe'
  ];
  m TEXT;
BEGIN
  FOREACH m IN ARRAY modulos LOOP
    -- admin: tudo
    INSERT INTO public.tenant_role_permissions (tenant_id, role, module, can_access)
    VALUES (p_tenant_id, 'admin', m, true)
    ON CONFLICT (tenant_id, role, module) DO NOTHING;

    -- analista: tudo exceto settings_equipe
    INSERT INTO public.tenant_role_permissions (tenant_id, role, module, can_access)
    VALUES (p_tenant_id, 'analista', m, m <> 'settings_equipe')
    ON CONFLICT (tenant_id, role, module) DO NOTHING;

    -- comercial: dashboard, consulta, prospects, cedentes, crm, relatorios
    INSERT INTO public.tenant_role_permissions (tenant_id, role, module, can_access)
    VALUES (
      p_tenant_id, 'comercial', m,
      m IN ('dashboard', 'consulta', 'prospects', 'cedentes', 'crm', 'relatorios')
    )
    ON CONFLICT (tenant_id, role, module) DO NOTHING;

    -- comite: dashboard, cedentes, credito, audit_log
    INSERT INTO public.tenant_role_permissions (tenant_id, role, module, can_access)
    VALUES (
      p_tenant_id, 'comite', m,
      m IN ('dashboard', 'cedentes', 'credito', 'audit_log')
    )
    ON CONFLICT (tenant_id, role, module) DO NOTHING;

    -- leitor: dashboard, prospects, cedentes (read-only de fato depende das policies dos dados)
    INSERT INTO public.tenant_role_permissions (tenant_id, role, module, can_access)
    VALUES (
      p_tenant_id, 'leitor', m,
      m IN ('dashboard', 'prospects', 'cedentes')
    )
    ON CONFLICT (tenant_id, role, module) DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_permissions(UUID) TO authenticated;

-- Aplica seed pra todos os tenants existentes
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id FROM public.tenants LOOP
    PERFORM public.seed_default_permissions(t.id);
  END LOOP;
END $$;

-- Trigger pra seed automático em novos tenants
CREATE OR REPLACE FUNCTION public.on_tenant_created_seed_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_permissions(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_tenant_created_seed_perms ON public.tenants;
CREATE TRIGGER tr_tenant_created_seed_perms
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.on_tenant_created_seed_permissions();

-- =====================================================
-- 6. RPC user_can_access(_user_id, _module)
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_can_access(_user_id UUID, _module TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.tenant_role_permissions trp
      ON trp.role = ur.role
     AND trp.tenant_id = ur.tenant_id
    WHERE ur.user_id = _user_id
      AND trp.module = _module
      AND trp.can_access = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access(UUID, TEXT) TO authenticated;

-- =====================================================
-- 7. RPC accept_invitation(p_token, p_user_id)
-- =====================================================
-- Vincula user ao tenant + role do convite. Marca convite como usado.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id  UUID := auth.uid();
  v_invite   public.pending_invitations%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invite
  FROM public.pending_invitations
  WHERE token = p_token AND used_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou já usado' USING ERRCODE = 'P0001';
  END IF;

  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Convite expirado' USING ERRCODE = 'P0001';
  END IF;

  -- Atualiza profile pra apontar pro tenant
  UPDATE public.profiles
  SET tenant_id = v_invite.tenant_id
  WHERE user_id = v_user_id;

  -- Cria entrada em user_roles
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (v_user_id, v_invite.tenant_id, v_invite.role)
  ON CONFLICT (user_id, tenant_id, role) DO NOTHING;

  -- Marca convite como usado
  UPDATE public.pending_invitations
  SET used_at = now(), used_by = v_user_id
  WHERE id = v_invite.id;

  RETURN json_build_object(
    'ok', true,
    'tenant_id', v_invite.tenant_id,
    'role', v_invite.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;

-- =====================================================
-- 8. RPC get_invitation_info(p_token) — preview público
-- =====================================================
-- Pra mostrar na tela de signup "você foi convidado pra tenant X com role Y".
-- Não exige autenticação (uso na tela /auth antes do login).
CREATE OR REPLACE FUNCTION public.get_invitation_info(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv  RECORD;
BEGIN
  SELECT
    pi.email,
    pi.role,
    pi.expires_at,
    pi.used_at,
    t.nome AS tenant_name
  INTO v_inv
  FROM public.pending_invitations pi
  JOIN public.tenants t ON t.id = pi.tenant_id
  WHERE pi.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_inv.used_at IS NOT NULL THEN
    RETURN json_build_object('valid', false, 'reason', 'already_used');
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN json_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN json_build_object(
    'valid', true,
    'email', v_inv.email,
    'role', v_inv.role,
    'tenant_name', v_inv.tenant_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invitation_info(TEXT) TO anon, authenticated;

-- =====================================================
-- 9. RPC create_tenant_with_admin (super-admin only)
-- =====================================================
-- Cria tenant + gera convite pro admin inicial.
CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
  p_tenant_name TEXT,
  p_admin_email TEXT,
  p_tenant_plan public.tenant_plan DEFAULT 'trial',
  p_tenant_tipo public.tenant_type DEFAULT 'outro'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller   UUID := auth.uid();
  v_tenant   UUID;
  v_token    TEXT;
BEGIN
  IF NOT public.is_super_admin(v_caller) THEN
    RAISE EXCEPTION 'Apenas super-admin pode criar tenant' USING ERRCODE = '42501';
  END IF;

  -- Cria tenant (trigger seed_permissions roda automaticamente)
  INSERT INTO public.tenants (nome, plano, tipo, ativo)
  VALUES (p_tenant_name, p_tenant_plan, p_tenant_tipo, true)
  RETURNING id INTO v_tenant;

  -- Gera convite admin
  INSERT INTO public.pending_invitations (tenant_id, email, role, created_by)
  VALUES (v_tenant, p_admin_email, 'admin', v_caller)
  RETURNING token INTO v_token;

  RETURN json_build_object(
    'ok', true,
    'tenant_id', v_tenant,
    'invite_token', v_token,
    'invite_email', p_admin_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_tenant_with_admin(TEXT, TEXT, public.tenant_plan, public.tenant_type) TO authenticated;

COMMIT;
