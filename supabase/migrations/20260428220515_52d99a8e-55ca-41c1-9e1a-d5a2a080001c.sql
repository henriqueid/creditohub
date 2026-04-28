-- ==========================================
-- PARTE 1: Drop legacy permissive storage policies
-- ==========================================
DROP POLICY IF EXISTS "Allow all reads from analysis-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all deletes from analysis-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Allow all uploads to analysis-attachments" ON storage.objects;

-- ==========================================
-- PARTE 2: Schema p/ monitoring scheduling
-- ==========================================
ALTER TABLE public.monitoring_groups
  ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ DEFAULT now();

-- Índice para o seletor do runner (active + due)
CREATE INDEX IF NOT EXISTS idx_monitoring_groups_due
  ON public.monitoring_groups (next_run_at)
  WHERE is_active = true;

-- Índice de tenant para activities (usado pelo runner ao registrar alertas)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_client
  ON public.activities (tenant_id, client_id);

-- Habilita extensions de cron/http (idempotente)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;