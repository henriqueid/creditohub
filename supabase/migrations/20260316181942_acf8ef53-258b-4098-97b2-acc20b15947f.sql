
-- Create enum types
CREATE TYPE public.credit_recommendation AS ENUM ('approve', 'restrict', 'reject');
CREATE TYPE public.credit_status AS ENUM ('draft', 'in_committee', 'approved', 'approved_restricted', 'rejected');
CREATE TYPE public.committee_vote AS ENUM ('approve', 'restrict', 'reject');

-- Clients (Cedentes)
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj_cpf TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  data_fundacao DATE,
  segmento TEXT,
  cidade TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Credit Analysis
CREATE TABLE public.credit_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  responsavel_comercial TEXT,
  analista_credito TEXT,
  data_analise DATE DEFAULT CURRENT_DATE,
  faturamento_medio DECIMAL(15,2),
  volume_estimado DECIMAL(15,2),
  prazo_medio_titulos INTEGER,
  historico_socios TEXT,
  credit_score INTEGER,
  protestos TEXT,
  pendencias TEXT,
  cheques_sem_fundo TEXT,
  acoes_judiciais TEXT,
  observacoes_credito TEXT,
  analise_faturamento TEXT,
  estrutura_financeira TEXT,
  endividamento TEXT,
  dependencia_clientes TEXT,
  riscos TEXT,
  pontos_positivos TEXT,
  limite_sugerido DECIMAL(15,2),
  prazo_medio_permitido INTEGER,
  concentracao_maxima DECIMAL(5,2),
  garantias TEXT,
  parecer_analista TEXT,
  recommendation public.credit_recommendation,
  status public.credit_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to credit_analysis" ON public.credit_analysis FOR ALL USING (true) WITH CHECK (true);

-- Sacados
CREATE TABLE public.credit_analysis_sacados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  sacado_nome TEXT NOT NULL,
  percentual_faturamento DECIMAL(5,2),
  prazo_medio INTEGER
);

ALTER TABLE public.credit_analysis_sacados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sacados" ON public.credit_analysis_sacados FOR ALL USING (true) WITH CHECK (true);

-- Sócios
CREATE TABLE public.credit_analysis_socios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  participacao DECIMAL(5,2),
  cargo TEXT
);

ALTER TABLE public.credit_analysis_socios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to socios" ON public.credit_analysis_socios FOR ALL USING (true) WITH CHECK (true);

-- Committee Votes
CREATE TABLE public.credit_committee (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_role TEXT,
  vote public.committee_vote NOT NULL,
  observation TEXT,
  vote_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_committee ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to credit_committee" ON public.credit_committee FOR ALL USING (true) WITH CHECK (true);

-- Committee Result
CREATE TABLE public.committee_result (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_analysis_id UUID NOT NULL REFERENCES public.credit_analysis(id) ON DELETE CASCADE UNIQUE,
  limite_aprovado DECIMAL(15,2),
  prazo_aprovado INTEGER,
  concentracao_maxima DECIMAL(5,2),
  condicoes_adicionais TEXT,
  decisao_final public.credit_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.committee_result ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to committee_result" ON public.committee_result FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_credit_analysis_updated_at
  BEFORE UPDATE ON public.credit_analysis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
