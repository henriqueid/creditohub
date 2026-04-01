
-- Tabela de regras do motor de crédito
CREATE TABLE public.credit_engine_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('score_range', 'weight', 'limit_factor', 'rate', 'cutoff', 'auto_approve', 'concentration', 'deadline', 'custom')),
  description TEXT,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_engine_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to credit_engine_rules"
ON public.credit_engine_rules
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_credit_engine_rules_updated_at
BEFORE UPDATE ON public.credit_engine_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed com regras padrão do motor
INSERT INTO public.credit_engine_rules (rule_name, rule_type, description, parameters, priority) VALUES
-- Faixas de Score
('Score AAA', 'score_range', 'Classificação AAA - Risco Muito Baixo', '{"min": 900, "max": 1000, "grade": "AAA", "risk_label": "Muito Baixo", "color": "#059669"}', 1),
('Score AA', 'score_range', 'Classificação AA - Risco Baixo', '{"min": 800, "max": 899, "grade": "AA", "risk_label": "Baixo", "color": "#10b981"}', 2),
('Score A', 'score_range', 'Classificação A - Risco Baixo-Médio', '{"min": 700, "max": 799, "grade": "A", "risk_label": "Baixo-Médio", "color": "#34d399"}', 3),
('Score BBB', 'score_range', 'Classificação BBB - Risco Médio', '{"min": 600, "max": 699, "grade": "BBB", "risk_label": "Médio", "color": "#fbbf24"}', 4),
('Score BB', 'score_range', 'Classificação BB - Risco Médio-Alto', '{"min": 500, "max": 599, "grade": "BB", "risk_label": "Médio-Alto", "color": "#f59e0b"}', 5),
('Score B', 'score_range', 'Classificação B - Risco Alto', '{"min": 400, "max": 499, "grade": "B", "risk_label": "Alto", "color": "#f97316"}', 6),
('Score CCC', 'score_range', 'Classificação CCC - Risco Muito Alto', '{"min": 300, "max": 399, "grade": "CCC", "risk_label": "Muito Alto", "color": "#ef4444"}', 7),
('Score CC', 'score_range', 'Classificação CC - Risco Crítico', '{"min": 200, "max": 299, "grade": "CC", "risk_label": "Crítico", "color": "#dc2626"}', 8),
('Score C', 'score_range', 'Classificação C - Risco Severo', '{"min": 100, "max": 199, "grade": "C", "risk_label": "Severo", "color": "#b91c1c"}', 9),
('Score D', 'score_range', 'Classificação D - Default', '{"min": 0, "max": 99, "grade": "D", "risk_label": "Default", "color": "#7f1d1d"}', 10),

-- Pesos do Radar de Risco
('Peso - Score Crédito', 'weight', 'Peso da dimensão Score de Crédito no radar', '{"dimension": "credito", "weight": 25}', 1),
('Peso - Restritivos', 'weight', 'Peso da dimensão Restritivos no radar', '{"dimension": "restritivos", "weight": 20}', 2),
('Peso - Capacidade', 'weight', 'Peso da dimensão Capacidade Financeira no radar', '{"dimension": "capacidade", "weight": 12}', 3),
('Peso - Concentração', 'weight', 'Peso da dimensão Concentração de Sacados no radar', '{"dimension": "concentracao", "weight": 10}', 4),
('Peso - Rentabilidade', 'weight', 'Peso da dimensão Rentabilidade no radar', '{"dimension": "rentabilidade", "weight": 10}', 5),
('Peso - Maturidade', 'weight', 'Peso da dimensão Maturidade do Negócio no radar', '{"dimension": "maturidade", "weight": 8}', 6),
('Peso - Diversificação', 'weight', 'Peso da dimensão Diversificação de Sacados no radar', '{"dimension": "diversificacao", "weight": 8}', 7),
('Peso - Pagamentos', 'weight', 'Peso da dimensão Histórico de Pagamentos no radar', '{"dimension": "pagamentos", "weight": 7}', 8),

-- Fatores de Limite por faixa de score
('Limite - Score >= 800', 'limit_factor', 'Fator de limite para score >= 800', '{"min_score": 800, "factor_percent": 30}', 1),
('Limite - Score >= 600', 'limit_factor', 'Fator de limite para score >= 600', '{"min_score": 600, "factor_percent": 25}', 2),
('Limite - Score >= 400', 'limit_factor', 'Fator de limite para score >= 400', '{"min_score": 400, "factor_percent": 20}', 3),
('Limite - Score >= 200', 'limit_factor', 'Fator de limite para score >= 200', '{"min_score": 200, "factor_percent": 15}', 4),
('Limite - Score < 200', 'limit_factor', 'Fator de limite para score < 200', '{"min_score": 0, "factor_percent": 10}', 5),

-- Taxas por faixa
('Taxa - Score >= 800', 'rate', 'Taxa base para score >= 800', '{"min_score": 800, "base_rate": 1.5, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 1),
('Taxa - Score >= 600', 'rate', 'Taxa base para score >= 600', '{"min_score": 600, "base_rate": 2.0, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 2),
('Taxa - Score >= 400', 'rate', 'Taxa base para score >= 400', '{"min_score": 400, "base_rate": 2.8, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 3),
('Taxa - Score < 400', 'rate', 'Taxa base para score < 400', '{"min_score": 0, "base_rate": 3.5, "prazo_adjustment_30": 0, "prazo_adjustment_45": 0.1, "prazo_adjustment_60": 0.3, "prazo_adjustment_90": 0.5}', 4),

-- Regras de corte (auto-reject)
('Corte - Score Mínimo', 'cutoff', 'Rejeitar automaticamente se score abaixo do mínimo', '{"field": "credit_score", "operator": "lt", "value": 150, "action": "reject", "message": "Score abaixo do mínimo aceitável"}', 1),
('Corte - Protestos', 'cutoff', 'Alertar se possui protestos', '{"field": "protestos", "operator": "not_nada_consta", "action": "alert", "message": "Possui protestos registrados"}', 2),
('Corte - Ações Judiciais', 'cutoff', 'Alertar se possui ações judiciais', '{"field": "acoes_judiciais", "operator": "not_nada_consta", "action": "alert", "message": "Possui ações judiciais"}', 3),
('Corte - Tempo Atividade', 'cutoff', 'Alertar se menos de 2 anos de atividade', '{"field": "tempo_atividade", "operator": "lt_years", "value": 2, "action": "alert", "message": "Empresa com menos de 2 anos de atividade"}', 4),

-- Regras de aprovação automática
('Auto-Aprovação', 'auto_approve', 'Aprovar automaticamente se atender todos os critérios', '{"min_score": 750, "max_concentration": 25, "requires_nada_consta": true, "min_years": 3, "min_sacados": 3}', 1),

-- Concentração
('Concentração Máxima', 'concentration', 'Limite máximo de concentração por sacado', '{"max_single_percent": 30, "max_hhi": 2500, "min_sacados": 3}', 1),

-- Prazos
('Prazo Máximo', 'deadline', 'Prazo máximo permitido para títulos', '{"max_prazo_dias": 90, "prazo_ideal_dias": 30}', 1);
