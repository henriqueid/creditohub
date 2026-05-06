import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Master list dos campos que podem ser exigidos antes de enviar ao comitê.
// Fonte da verdade — Settings.tsx importa daqui pra montar a UI por blocos.
export const COMMITTEE_FIELD_OPTIONS: { key: string; label: string; block: string }[] = [
  // Identificação
  { key: "client_id",             label: "Cedente selecionado",       block: "Identificação" },
  { key: "responsavel_comercial", label: "Responsável comercial",     block: "Identificação" },
  { key: "analista_credito",      label: "Analista de crédito",       block: "Identificação" },
  { key: "tempo_atividade",       label: "Tempo de atividade",        block: "Identificação" },
  // Operacional
  { key: "faturamento_medio",     label: "Faturamento médio",         block: "Operacional" },
  { key: "volume_estimado",       label: "Volume estimado",           block: "Operacional" },
  { key: "prazo_medio_titulos",   label: "Prazo médio dos títulos",   block: "Operacional" },
  { key: "numero_funcionarios",   label: "Número de funcionários",    block: "Operacional" },
  // Societária
  { key: "socios_min_1",          label: "Ao menos 1 sócio",          block: "Societária" },
  { key: "capital_social",        label: "Capital social",            block: "Societária" },
  { key: "historico_socios",      label: "Histórico dos sócios",      block: "Societária" },
  // Sacados
  { key: "sacados_min_1",         label: "Ao menos 1 sacado",         block: "Sacados" },
  // Crédito
  { key: "credit_score",          label: "Score de crédito",          block: "Crédito" },
  { key: "protestos",             label: "Verificação de protestos",  block: "Crédito" },
  { key: "pendencias",            label: "Verificação de pendências", block: "Crédito" },
  { key: "acoes_judiciais",       label: "Ações judiciais",           block: "Crédito" },
  // Referências
  { key: "referencias_bancarias",  label: "Referências bancárias",    block: "Referências" },
  { key: "referencias_comerciais", label: "Referências comerciais",   block: "Referências" },
  // Financeira
  { key: "analise_faturamento",   label: "Análise de faturamento",    block: "Financeira" },
  { key: "estrutura_financeira",  label: "Estrutura financeira",      block: "Financeira" },
  { key: "endividamento",         label: "Endividamento",             block: "Financeira" },
  // Riscos
  { key: "riscos",                label: "Riscos identificados",      block: "Riscos" },
  { key: "pontos_positivos",      label: "Pontos positivos",          block: "Riscos" },
  // Operação
  { key: "limite_sugerido",       label: "Limite sugerido",           block: "Operação" },
  { key: "modalidade_operacao",   label: "Modalidade(s) da operação", block: "Operação" },
  { key: "taxa_sugerida",         label: "Taxa sugerida",             block: "Operação" },
  { key: "garantias",             label: "Garantias",                 block: "Operação" },
  // Parecer
  { key: "parecer_analista",      label: "Parecer do analista",       block: "Parecer" },
  { key: "recommendation",        label: "Recomendação",              block: "Parecer" },
];

export const COMMITTEE_FIELD_LABELS: Record<string, string> = Object.fromEntries(
  COMMITTEE_FIELD_OPTIONS.map(o => [o.key, o.label]),
);

export const DEFAULT_REQUIRED_FIELDS: string[] = [
  "client_id", "credit_score", "faturamento_medio", "limite_sugerido",
  "prazo_medio_titulos", "parecer_analista", "sacados_min_1",
];

/**
 * Lê do system_settings a lista de campos obrigatórios pra envio ao comitê.
 * Configurável em /configuracoes → "Requisitos do comitê".
 */
export function useCommitteeRequirements() {
  return useQuery({
    queryKey: ["committee-required-fields"],
    queryFn: async (): Promise<string[]> => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "committee_required_fields")
        .maybeSingle();

      const raw = data?.value;
      if (!raw) return DEFAULT_REQUIRED_FIELDS;

      try {
        // value pode vir como JSON (string ou já parsed pelo PostgREST)
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
      } catch { /* fallback */ }
      return DEFAULT_REQUIRED_FIELDS;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Avalia uma análise contra a lista de campos exigidos.
 * Retorna pct (0-100) e quais labels estão faltando.
 */
export function evaluateReadiness(
  requiredKeys: string[],
  analysis: Record<string, any>,
  extras: { sacadosCount?: number; sociosCount?: number } = {},
): { pct: number; missing: string[]; checks: { label: string; ok: boolean }[] } {
  const checks = requiredKeys.map(key => {
    let ok = false;
    if (key === "sacados_min_1") {
      // pode vir como número direto ou como join {count}
      const c = extras.sacadosCount ?? analysis.credit_analysis_sacados?.[0]?.count ?? analysis.sacados?.length ?? 0;
      ok = (c as number) > 0;
    } else if (key === "socios_min_1") {
      const c = extras.sociosCount ?? analysis.credit_analysis_socios?.[0]?.count ?? analysis.socios?.length ?? 0;
      ok = (c as number) > 0;
    } else {
      const v = analysis[key];
      ok = v !== null && v !== undefined && v !== "" && v !== 0;
    }
    return { label: COMMITTEE_FIELD_LABELS[key] || key, ok };
  });

  const filled = checks.filter(c => c.ok).length;
  const total = checks.length || 1;
  return {
    pct: Math.round((filled / total) * 100),
    missing: checks.filter(c => !c.ok).map(c => c.label),
    checks,
  };
}
