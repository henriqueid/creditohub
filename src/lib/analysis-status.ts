/**
 * Status enum da análise de crédito (espelha credit_analysis.status no banco).
 * Use estas constantes em vez de strings literais nos componentes.
 */
export const ANALYSIS_STATUS = {
  draft:               "draft",
  in_committee:        "in_committee",
  approved:            "approved",
  approved_restricted: "approved_restricted",
  rejected:            "rejected",
} as const;

export type AnalysisStatus = typeof ANALYSIS_STATUS[keyof typeof ANALYSIS_STATUS];

export const ANALYSIS_STATUS_LABEL: Record<AnalysisStatus, string> = {
  draft:               "Em análise",
  in_committee:        "Comitê",
  approved:            "Aprovado",
  approved_restricted: "Restrito",
  rejected:            "Reprovado",
};

/**
 * Mapeia status de análise → estágio do deal_stages no Pipeline.
 * Recebe a lista de stages já carregada (sem fetch interno).
 */
export function findDealStageForAnalysisStatus(
  status: AnalysisStatus,
  stages: { id: string; name: string; is_won: boolean; is_lost: boolean }[],
): string | null {
  if (!stages.length) return null;

  switch (status) {
    case "approved":
    case "approved_restricted":
      return stages.find(s => s.is_won)?.id ?? null;
    case "rejected":
      return stages.find(s => s.is_lost)?.id ?? null;
    case "in_committee":
      return stages.find(s => /comit/i.test(s.name))?.id ?? null;
    case "draft":
      return stages.find(s => !s.is_won && !s.is_lost)?.id ?? null;
    default:
      return null;
  }
}
