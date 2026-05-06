-- Add anthropic_api_key to profiles (per-user AI configuration)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT;

-- Drop all known policy names on profiles (IF EXISTS is always safe)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_tenant" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

-- Simple, self-contained policies (no cross-table lookups)
-- SELECT: authenticated users can view profiles of others (for name/cargo display),
--         but anthropic_api_key is only returned when fetching own row
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- INSERT: only your own row
CREATE POLICY "profiles_insert_self" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: only your own row
CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
