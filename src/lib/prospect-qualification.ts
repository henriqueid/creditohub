import { supabase } from "@/integrations/supabase/client";

interface QualificationInput {
  documento: string;
  nome?: string;
  tipo: "cpf" | "cnpj";
  clientId?: string;
  // Credit data if client exists
  creditScore?: number | null;
  limiteAprovado?: number | null;
  analysisStatus?: string | null;
  hasProtestos?: boolean;
  hasPendencias?: boolean;
  hasAcoesJudiciais?: boolean;
  hasBlacklist?: boolean;
  tempoAtividade?: string | null;
  faturamentoMedio?: number | null;
  // External data
  externalData?: Record<string, any>;
  // Snapshot completo da consulta (BrasilAPI + bureau + restritivos)
  // — armazenado para reaproveitar ao converter o prospect em cliente/análise.
  snapshot?: Record<string, any>;
}

export interface QualificationResult {
  status: "qualified" | "not_qualified" | "pending";
  score: number;
  riskLevel: "low" | "medium" | "high" | "unknown";
  reasons: string[];
  positives: string[];
  suggestedAction: string;
}

interface CreditEngineRule {
  rule_name: string;
  rule_type: string;
  parameters: Record<string, any>;
  is_active: boolean;
}

export async function getQualificationValidityDays(): Promise<number> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "prospect_qualification_validity_days")
    .maybeSingle();
  if (data?.value) {
    const val = typeof data.value === "number" ? data.value : parseInt(String(data.value), 10);
    return isNaN(val) ? 30 : val;
  }
  return 30;
}

export async function qualifyProspect(input: QualificationInput): Promise<QualificationResult> {
  // Fetch active credit engine rules
  const { data: rules = [] } = await supabase
    .from("credit_engine_rules")
    .select("rule_name, rule_type, parameters, is_active")
    .eq("is_active", true)
    .order("priority");

  const typedRules = (rules || []) as CreditEngineRule[];

  // Score começa em 0 — só sobe com sinais positivos concretos (creditScore,
  // análise aprovada, faturamento, cliente já cadastrado). Sem dados,
  // permanece 0 e cai em "not_qualified" (não em "pending neutro").
  let score = 0;
  const reasons: string[] = [];
  const positives: string[] = [];

  // 1. Blacklist check (instant disqualification)
  if (input.hasBlacklist) {
    return {
      status: "not_qualified",
      score: 0,
      riskLevel: "high",
      reasons: ["Documento consta na blacklist"],
      positives: [],
      suggestedAction: "Documento bloqueado — não prosseguir",
    };
  }

  // Sinais mínimos pra calcular score: creditScore, análise prévia, faturamento OU já é cliente.
  // Sem nada disso, retorna pending sem score artificial (em vez de fingir um 50 base).
  const hasAnySignal =
    input.creditScore != null ||
    input.analysisStatus != null ||
    (input.faturamentoMedio != null && input.faturamentoMedio > 0) ||
    !!input.clientId;
  if (!hasAnySignal) {
    return {
      status: "pending",
      score: 0,
      riskLevel: "unknown",
      reasons: ["Sem dados de crédito — consulte bureau ou aguarde análise"],
      positives: [],
      suggestedAction: "Sem score: dispare uma consulta ou inicie análise pra qualificar",
    };
  }

  // 2. Apply cutoff rules
  const cutoffRules = typedRules.filter(r => r.rule_type === "cutoff");
  for (const rule of cutoffRules) {
    const p = rule.parameters;
    if (p.field === "credit_score" && input.creditScore != null) {
      if (p.operator === "lt" && input.creditScore < (p.value || 0)) {
        reasons.push(p.message || `Score ${input.creditScore} abaixo do mínimo`);
        score -= 30;
      }
    }
    if (p.field === "protestos" && input.hasProtestos) {
      reasons.push(p.message || "Possui protestos");
      score -= 15;
    }
    if (p.field === "acoes_judiciais" && input.hasAcoesJudiciais) {
      reasons.push(p.message || "Possui ações judiciais");
      score -= 15;
    }
    if (p.field === "tempo_atividade" && input.tempoAtividade) {
      // Simple heuristic
      score -= 5;
    }
  }

  // 3. Score-based evaluation
  if (input.creditScore != null) {
    const scoreRanges = typedRules.filter(r => r.rule_type === "score_range");
    const matchedRange = scoreRanges.find(r => {
      const p = r.parameters;
      return input.creditScore! >= (p.min || 0) && input.creditScore! <= (p.max || 1000);
    });
    if (matchedRange) {
      const riskLabel = matchedRange.parameters.risk_label;
      if (riskLabel === "Muito Baixo" || riskLabel === "Baixo") {
        score += 30;
        positives.push(`Score de crédito ${input.creditScore} (${matchedRange.parameters.grade})`);
      } else if (riskLabel === "Médio" || riskLabel === "Baixo-Médio") {
        score += 10;
        positives.push(`Score de crédito ${input.creditScore} (${matchedRange.parameters.grade})`);
      } else {
        score -= 10;
        reasons.push(`Score de crédito baixo: ${input.creditScore} (${matchedRange.parameters.grade})`);
      }
    }
  }

  // 4. Existing client bonus
  if (input.clientId) {
    score += 10;
    positives.push("Cliente já cadastrado na base");
  }

  // 5. Analysis status bonus
  if (input.analysisStatus === "approved") {
    score += 20;
    positives.push("Possui análise de crédito aprovada");
  } else if (input.analysisStatus === "approved_restricted") {
    score += 10;
    positives.push("Possui análise aprovada com restrição");
  } else if (input.analysisStatus === "rejected") {
    score -= 20;
    reasons.push("Análise de crédito anterior foi rejeitada");
  }

  // 6. Revenue consideration
  if (input.faturamentoMedio && input.faturamentoMedio > 100000) {
    score += 10;
    positives.push(`Faturamento médio: R$ ${(input.faturamentoMedio / 1000).toFixed(0)}k`);
  }

  // 7. Pendências
  if (input.hasPendencias) {
    score -= 10;
    reasons.push("Possui pendências financeiras registradas");
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score));

  // Determine status and risk
  let status: QualificationResult["status"];
  let riskLevel: QualificationResult["riskLevel"];
  let suggestedAction: string;

  if (score >= 60) {
    status = "qualified";
    riskLevel = score >= 80 ? "low" : "medium";
    suggestedAction = score >= 80
      ? "Prospect qualificado — iniciar abordagem comercial"
      : "Prospect qualificado com ressalvas — avaliar condições";
  } else if (score >= 30) {
    status = "pending";
    riskLevel = "medium";
    suggestedAction = "Qualificação inconclusiva — necessita análise manual";
  } else {
    status = "not_qualified";
    riskLevel = "high";
    suggestedAction = "Prospect não qualificado — risco elevado";
  }

  return { status, score, riskLevel, reasons, positives, suggestedAction };
}

export async function saveProspectQualification(
  input: QualificationInput,
  result: QualificationResult,
): Promise<void> {
  const validityDays = await getQualificationValidityDays();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validityDays);

  const { error } = await supabase
    .from("prospects")
    .upsert({
      documento: input.documento,
      nome: input.nome || null,
      tipo: input.tipo,
      qualification_status: result.status,
      qualification_score: result.score,
      risk_level: result.riskLevel,
      qualification_data: {
        reasons: result.reasons,
        positives: result.positives,
        suggestedAction: result.suggestedAction,
        creditScore: input.creditScore,
        analysisStatus: input.analysisStatus,
        hasBlacklist: input.hasBlacklist,
        snapshot: input.snapshot ?? null,
      },
      client_id: input.clientId || null,
      source: "consulta",
      expires_at: expiresAt.toISOString(),
    }, { onConflict: "documento" });

  if (error) throw error;
}
