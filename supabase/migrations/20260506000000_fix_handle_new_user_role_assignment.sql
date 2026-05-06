-- Fix: handle_new_user() não estava criando user_roles nem setando tenant_id no profile.
-- Resultado: novos usuários falhavam todas as policies tenant-scoped (clients, deals, etc).

-- 1. Backfill: garantir que TODOS os usuários existentes tenham profile com tenant_id
--    e user_roles como admin no tenant default.
UPDATE public.profiles
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL
ON CONFLICT DO NOTHING;

-- Garante profile pra qualquer auth.user que ainda não tenha
INSERT INTO public.profiles (user_id, full_name, tenant_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  '00000000-0000-0000-0000-000000000001'::uuid
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO UPDATE
  SET tenant_id = COALESCE(public.profiles.tenant_id, EXCLUDED.tenant_id);

-- 2. Atualiza a trigger handle_new_user para criar profile + tenant + role automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_tenant UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Profile com tenant_id já setado
  INSERT INTO public.profiles (user_id, full_name, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_tenant
  )
  ON CONFLICT (user_id) DO UPDATE
    SET tenant_id = COALESCE(public.profiles.tenant_id, default_tenant);

  -- User role como admin no tenant default
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, default_tenant, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger já existe (on_auth_user_created), só atualizamos a função.
