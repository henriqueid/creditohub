-- Endurece RLS de profiles: SELECT estrito (só própria row + visibilidade limitada
-- pra mesmo tenant via VIEW que esconde anthropic_api_key).
--
-- Antes desta migration: profiles_select_authenticated USING (true) — qualquer
-- usuário autenticado lia profiles de qualquer outro, incluindo anthropic_api_key.

DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_tenant" ON public.profiles;

-- SELECT: usuário só vê o próprio profile completo.
-- Pra exibir nome/cargo de colegas em UI (CRM, Comitê), use a VIEW abaixo.
CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- VIEW pública pro tenant — sem campos sensíveis (anthropic_api_key, futuras keys).
-- Use-a no frontend quando precisar mostrar lista/atributos básicos de outros users.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  cargo,
  tenant_id,
  created_at
FROM public.profiles;

-- Grant READ on view (RLS herdada da tabela base, mas a view não expõe a key).
GRANT SELECT ON public.profiles_public TO authenticated;

-- Refaz INSERT/UPDATE policies (permanecem self-only).
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Permite SELECT na view via mesma RLS aplicada à profiles.
-- Se quiser visibilidade tenant-wide (para mostrar colegas), adiciona policy:
DROP POLICY IF EXISTS "profiles_select_tenant_basic" ON public.profiles;

-- Habilitada APENAS quando consumida via view (a view filtra colunas).
-- Aqui adicionamos uma policy ampla pra view; o anthropic_api_key NUNCA é exposto
-- porque a view não inclui essa coluna.
-- Como a view herda RLS da tabela base (em PostgreSQL), precisamos abrir SELECT
-- pro tenant também na tabela. Mas isso re-vaza a key. Solução: usar SECURITY
-- DEFINER function pra ler atributos não-sensíveis de colegas.

CREATE OR REPLACE FUNCTION public.get_tenant_colleagues()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  cargo TEXT,
  avatar_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.cargo, p.avatar_url
  FROM public.profiles p
  WHERE p.tenant_id = public.get_user_tenant_id(auth.uid())
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_colleagues() TO authenticated;
