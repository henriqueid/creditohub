/**
 * Credit analysis automatic calculations and risk engine
 * Inspired by Dimensa/Vadu platform logic
 */

export type RiskLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export interface RiskClassification {
  level: RiskLevel;
  label: string;
  color: string;
  bgColor: string;
  score: number; // 0–100 internal
}

export function classifyRisk(creditScore: number | null): RiskClassification {
  const s = creditScore ?? 0;
  if (s >= 800) return { level: "very_low", label: "Muito Baixo", color: "text-emerald-700", bgColor: "bg-emerald-500", score: s };
  if (s >= 600) return { level: "low", label: "Baixo", color: "text-green-600", bgColor: "bg-green-500", score: s };
  if (s >= 400) return { level: "medium", label: "Médio", color: "text-amber-600", bgColor: "bg-amber-500", score: s };
  if (s >= 200) return { level: "high", label: "Alto", color: "text-orange-600", bgColor: "bg-orange-500", score: s };
  return { level: "very_high", label: "Muito Alto", color: "text-red-600", bgColor: "bg-red-500", score: s };
}

export function suggestLimit(faturamentoMedio: number | null, creditScore: number | null): number {
  if (!faturamentoMedio || faturamentoMedio <= 0) return 0;
  const score = creditScore ?? 0;
  let factor = 0.10; // default 10% of revenue
  if (score >= 800) factor = 0.30;
  else if (score >= 600) factor = 0.25;
  else if (score >= 400) factor = 0.20;
  else if (score >= 200) factor = 0.15;
  return Math.round(faturamentoMedio * factor);
}

export function calculateConcentration(sacados: { percentual_faturamento: number | null }[]): {
  totalConcentration: number;
  maxSingleConcentration: number;
  alerts: string[];
} {
  const values = sacados.map(s => s.percentual_faturamento ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  const alerts: string[] = [];

  if (max > 30) alerts.push(`Sacado com ${max.toFixed(1)}% de concentração (acima de 30%)`);
  if (total > 100) alerts.push(`Soma da concentração excede 100% (${total.toFixed(1)}%)`);
  if (sacados.length < 3 && sacados.length > 0) alerts.push("Poucos sacados diversificados (< 3)");

  return { totalConcentration: total, maxSingleConcentration: max, alerts };
}

export function calculateSociosTotal(socios: { participacao: number | null }[]): {
  totalParticipacao: number;
  isValid: boolean;
} {
  const total = socios.reduce((a, s) => a + (s.participacao ?? 0), 0);
  return { totalParticipacao: total, isValid: Math.abs(total - 100) < 0.5 || socios.length === 0 };
}

export function calculateLimitUtilization(volumeEstimado: number | null, limiteSugerido: number | null): number {
  if (!limiteSugerido || limiteSugerido <= 0 || !volumeEstimado) return 0;
  return Math.min((volumeEstimado / limiteSugerido) * 100, 200);
}

export function getScoreGrade(score: number | null): string {
  const s = score ?? 0;
  if (s >= 900) return "AAA";
  if (s >= 800) return "AA";
  if (s >= 700) return "A";
  if (s >= 600) return "BBB";
  if (s >= 500) return "BB";
  if (s >= 400) return "B";
  if (s >= 300) return "CCC";
  if (s >= 200) return "CC";
  if (s >= 100) return "C";
  return "D";
}

export function generateAutoSummary(data: {
  creditScore: number | null;
  faturamentoMedio: number | null;
  limiteSugerido: number | null;
  volumeEstimado: number | null;
  sacadosCount: number;
  sociosCount: number;
  protestos: string | null;
  pendencias: string | null;
}): string[] {
  const items: string[] = [];
  const risk = classifyRisk(data.creditScore);
  const grade = getScoreGrade(data.creditScore);

  items.push(`Score ${data.creditScore ?? 0} — Classificação ${grade} (Risco ${risk.label})`);

  if (data.faturamentoMedio) {
    const suggested = suggestLimit(data.faturamentoMedio, data.creditScore);
    items.push(`Limite sugerido automático: R$ ${suggested.toLocaleString("pt-BR")}`);
  }

  if (data.limiteSugerido && data.volumeEstimado) {
    const util = calculateLimitUtilization(data.volumeEstimado, data.limiteSugerido);
    items.push(`Utilização do limite: ${util.toFixed(0)}%`);
  }

  if (data.sacadosCount === 0) items.push("⚠ Nenhum sacado cadastrado");
  if (data.sociosCount === 0) items.push("⚠ Nenhum sócio cadastrado");

  const hasProtestos = data.protestos && data.protestos.toLowerCase() !== "nada consta";
  const hasPendencias = data.pendencias && data.pendencias.toLowerCase() !== "nada consta";
  if (hasProtestos) items.push("⚠ Possui protestos registrados");
  if (hasPendencias) items.push("⚠ Possui pendências financeiras");

  return items;
}
