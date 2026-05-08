-- =====================================================
-- Super-admin: policies de bypass cross-tenant
-- =====================================================
-- O super-admin (profiles.is_super_admin = true) cria/gerencia tenants e
-- precisa enxergar/atualizar tenants fora do próprio tenant_id, senão
-- create_tenant_with_admin insere mas o caller nunca lê o que criou.
--
-- Apenas leitura/escrita em tabelas administrativas (tenants, user_roles,
-- pending_invitations, tenant_role_permissions). Não estende bypass para
-- dados de negócio (clients, credit_analysis, deals, etc).
-- =====================================================

BEGIN;

-- ─── tenants ──────────────────────────────────────────
DROP POLICY IF EXISTS "tenants_super_admin_select" ON public.tenants;
CREATE POLICY "tenants_super_admin_select" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenants_super_admin_insert" ON public.tenants;
CREATE POLICY "tenants_super_admin_insert" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenants_super_admin_update" ON public.tenants;
CREATE POLICY "tenants_super_admin_update" ON public.tenants
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "tenants_super_admin_delete" ON public.tenants;
CREATE POLICY "tenants_super_admin_delete" ON public.tenants
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- ─── user_roles ───────────────────────────────────────
-- Super-admin precisa criar role inicial em tenant recém-criado e auditar usuários.
DROP POLICY IF EXISTS "user_roles_super_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_super_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ─── tenant_role_permissions ──────────────────────────
DROP POLICY IF EXISTS "trp_super_admin_all" ON public.tenant_role_permissions;
CREATE POLICY "trp_super_admin_all" ON public.tenant_role_permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ─── pending_invitations ──────────────────────────────
DROP POLICY IF EXISTS "pi_super_admin_all" ON public.pending_invitations;
CREATE POLICY "pi_super_admin_all" ON public.pending_invitations
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ─── profiles ─────────────────────────────────────────
-- Super-admin pode ler perfis de qualquer tenant (suporte/gestão de usuários).
-- Não pode editar perfil alheio (cada usuário gerencia o próprio).
DROP POLICY IF EXISTS "profiles_super_admin_select" ON public.profiles;
CREATE POLICY "profiles_super_admin_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

COMMIT;
