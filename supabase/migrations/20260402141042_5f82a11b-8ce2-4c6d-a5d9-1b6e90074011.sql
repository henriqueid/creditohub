
-- Grupos de monitoramento
CREATE TABLE public.monitoring_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily',
  alerta_email BOOLEAN NOT NULL DEFAULT false,
  alerta_sistema BOOLEAN NOT NULL DEFAULT true,
  limiar_variacao NUMERIC DEFAULT 20,
  limiar_atraso_dias INTEGER DEFAULT 5,
  concentracao_maxima NUMERIC DEFAULT 30,
  volume_minimo NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.monitoring_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to monitoring_groups"
ON public.monitoring_groups FOR ALL
USING (true) WITH CHECK (true);

-- Relacionamento grupo <-> clientes
CREATE TABLE public.monitoring_group_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.monitoring_groups(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, client_id)
);

ALTER TABLE public.monitoring_group_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to monitoring_group_clients"
ON public.monitoring_group_clients FOR ALL
USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE TRIGGER update_monitoring_groups_updated_at
BEFORE UPDATE ON public.monitoring_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
