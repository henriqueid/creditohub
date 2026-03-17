/**
 * Credit analysis automatic calculations and risk engine
 * Inspired by Dimensa/Vadu platform logic + modern FIDC/Factoring standards
 */

export type RiskLevel = "very_low" | "low" | "medium" | "high" | "very_high";

export interface RiskClassification {
  level: RiskLevel;
  label: string;
  color: string;
  bgColor: string;
  score: number;
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
  let factor = 0.10;
  if (score >= 800) factor = 0.30;
  else if (score >= 600) factor = 0.25;
  else if (score >= 400) factor = 0.20;
  else if (score >= 200) factor = 0.15;
  return Math.round(faturamentoMedio * factor);
}

export function calculateConcentration(sacados: { percentual_faturamento: number | null }[]): {
  totalConcentration: number;
  maxSingleConcentration: number;
  hhi: number;
  alerts: string[];
} {
  const values = sacados.map(s => s.percentual_faturamento ?? 0);
  const total = values.reduce((a, b) => a + b, 0);
  const max = values.length > 0 ? Math.max(...values) : 0;
  // Herfindahl-Hirschman Index (HHI) — normalized 0-10000
  const hhi = values.reduce((acc, v) => acc + v * v, 0);
  const alerts: string[] = [];

  if (max > 30) alerts.push(`Sacado com ${max.toFixed(1)}% de concentração (acima de 30%)`);
  if (total > 100) alerts.push(`Soma da concentração excede 100% (${total.toFixed(1)}%)`);
  if (sacados.length < 3 && sacados.length > 0) alerts.push("Poucos sacados diversificados (< 3)");
  if (hhi > 2500 && sacados.length > 1) alerts.push(`Índice HHI alto: ${hhi.toFixed(0)} (mercado concentrado > 2500)`);

  return { totalConcentration: total, maxSingleConcentration: max, hhi, alerts };
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

// ─── Advanced Financial Calculations ────────────────────────────

export interface FinancialRatios {
  margemLiquidaNum: number | null;
  indiceLiquidezNum: number | null;
  endividamentoRelativo: number | null; // debt / revenue
  coberturaDivida: number | null; // revenue / suggested limit
  capitalGiroLiquido: number | null;
  receitaPorFuncionario: number | null;
}

export function calculateFinancialRatios(data: {
  receitaLiquida: number | null;
  faturamentoMedio: number | null;
  capitalSocial: number | null;
  limiteSugerido: number | null;
  volumeEstimado: number | null;
  numeroFuncionarios: number | null;
  margemLiquida: string | null;
  indiceLiquidez: string | null;
}): FinancialRatios {
  const parseNum = (s: string | null): number | null => {
    if (!s) return null;
    const cleaned = s.replace(/[^0-9,.\-]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
  };

  const margemLiquidaNum = parseNum(data.margemLiquida);
  const indiceLiquidezNum = parseNum(data.indiceLiquidez);

  const endividamentoRelativo = data.limiteSugerido && data.faturamentoMedio && data.faturamentoMedio > 0
    ? (data.limiteSugerido / data.faturamentoMedio) * 100 : null;

  const coberturaDivida = data.faturamentoMedio && data.limiteSugerido && data.limiteSugerido > 0
    ? data.faturamentoMedio / data.limiteSugerido : null;

  const capitalGiroLiquido = data.receitaLiquida && data.capitalSocial
    ? data.receitaLiquida - data.capitalSocial * 0.3 : null;

  const receitaPorFuncionario = data.receitaLiquida && data.numeroFuncionarios && data.numeroFuncionarios > 0
    ? data.receitaLiquida / data.numeroFuncionarios : null;

  return { margemLiquidaNum, indiceLiquidezNum, endividamentoRelativo, coberturaDivida, capitalGiroLiquido, receitaPorFuncionario };
}

// ─── Risk Radar (multi-dimensional 0–100 scoring) ───────────────

export interface RiskDimension {
  dimension: string;
  label: string;
  score: number; // 0-100 (100 = best)
  status: "good" | "warning" | "danger";
}

export function calculateRiskRadar(data: {
  creditScore: number | null;
  faturamentoMedio: number | null;
  limiteSugerido: number | null;
  volumeEstimado: number | null;
  sacadosCount: number;
  sociosCount: number;
  protestos: string | null;
  pendencias: string | null;
  acoesJudiciais: string | null;
  chequesSemFundo: string | null;
  historicoPagamentos: string | null;
  tempoAtividade: string | null;
  hhi: number;
  coberturaDivida: number | null;
  margemLiquidaNum: number | null;
}): RiskDimension[] {
  const nadaConsta = (s: string | null) => !s || s.toLowerCase().includes("nada consta") || s.toLowerCase().includes("nenhum");
  const parseYears = (s: string | null): number => {
    if (!s) return 0;
    const m = s.match(/(\d+)/);
    return m ? parseInt(m[1]) : 0;
  };

  const status = (score: number): "good" | "warning" | "danger" =>
    score >= 70 ? "good" : score >= 40 ? "warning" : "danger";

  // 1. Score de Crédito (0-1000 → 0-100)
  const scoreCredito = Math.min(((data.creditScore ?? 0) / 1000) * 100, 100);

  // 2. Restritivos (protestos, pendências, ações, cheques)
  const restritivos = [data.protestos, data.pendencias, data.acoesJudiciais, data.chequesSemFundo];
  const limpos = restritivos.filter(nadaConsta).length;
  const scoreRestritivos = (limpos / 4) * 100;

  // 3. Concentração (HHI: <1500=100, 1500-2500=50, >2500=20)
  const scoreConcentracao = data.hhi === 0 ? 50 : data.hhi < 1000 ? 100 : data.hhi < 1500 ? 80 : data.hhi < 2500 ? 50 : 20;

  // 4. Capacidade Financeira (cobertura da dívida)
  const scoreCap = data.coberturaDivida === null ? 50 :
    data.coberturaDivida >= 3 ? 100 : data.coberturaDivida >= 2 ? 80 :
    data.coberturaDivida >= 1 ? 50 : 20;

  // 5. Maturidade do Negócio
  const years = parseYears(data.tempoAtividade);
  const scoreMaturidade = years >= 10 ? 100 : years >= 5 ? 75 : years >= 2 ? 50 : 25;

  // 6. Diversificação de sacados
  const scoreDiversificacao = data.sacadosCount >= 5 ? 100 : data.sacadosCount >= 3 ? 70 : data.sacadosCount >= 1 ? 40 : 10;

  // 7. Margem / Rentabilidade
  const scoreRentabilidade = data.margemLiquidaNum === null ? 50 :
    data.margemLiquidaNum >= 15 ? 100 : data.margemLiquidaNum >= 8 ? 75 :
    data.margemLiquidaNum >= 3 ? 50 : 20;

  // 8. Histórico de Pagamentos
  const pagBom = data.historicoPagamentos &&
    (data.historicoPagamentos.toLowerCase().includes("pontual") || data.historicoPagamentos.toLowerCase().includes("sem atraso"));
  const pagRuim = data.historicoPagamentos &&
    (data.historicoPagamentos.toLowerCase().includes("atraso") || data.historicoPagamentos.toLowerCase().includes("inadimpl"));
  const scorePagamentos = !data.historicoPagamentos ? 50 : pagBom ? 90 : pagRuim ? 20 : 60;

  return [
    { dimension: "credito", label: "Score Crédito", score: Math.round(scoreCredito), status: status(scoreCredito) },
    { dimension: "restritivos", label: "Restritivos", score: Math.round(scoreRestritivos), status: status(scoreRestritivos) },
    { dimension: "concentracao", label: "Concentração", score: Math.round(scoreConcentracao), status: status(scoreConcentracao) },
    { dimension: "capacidade", label: "Capacidade", score: Math.round(scoreCap), status: status(scoreCap) },
    { dimension: "maturidade", label: "Maturidade", score: Math.round(scoreMaturidade), status: status(scoreMaturidade) },
    { dimension: "diversificacao", label: "Diversificação", score: Math.round(scoreDiversificacao), status: status(scoreDiversificacao) },
    { dimension: "rentabilidade", label: "Rentabilidade", score: Math.round(scoreRentabilidade), status: status(scoreRentabilidade) },
    { dimension: "pagamentos", label: "Pagamentos", score: Math.round(scorePagamentos), status: status(scorePagamentos) },
  ];
}

export function calculateOverallRiskScore(dimensions: RiskDimension[]): number {
  if (dimensions.length === 0) return 0;
  // Weighted average: credito (25%), restritivos (20%), others equally
  const weights: Record<string, number> = {
    credito: 25, restritivos: 20, concentracao: 10, capacidade: 12,
    maturidade: 8, diversificacao: 8, rentabilidade: 10, pagamentos: 7,
  };
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const weighted = dimensions.reduce((acc, d) => acc + d.score * (weights[d.dimension] || 10), 0);
  return Math.round(weighted / totalWeight);
}

// ─── Suggested Rate ─────────────────────────────────────────────

export function suggestRate(creditScore: number | null, prazoMedio: number | null): number {
  const s = creditScore ?? 0;
  let baseRate = 3.5;
  if (s >= 800) baseRate = 1.5;
  else if (s >= 600) baseRate = 2.0;
  else if (s >= 400) baseRate = 2.8;
  else if (s >= 200) baseRate = 3.2;

  // Prazo adjustment: longer = higher rate
  const prazo = prazoMedio ?? 30;
  const prazoFactor = prazo > 60 ? 0.5 : prazo > 45 ? 0.3 : prazo > 30 ? 0.1 : 0;

  return Math.round((baseRate + prazoFactor) * 100) / 100;
}

// ─── Revenue Trend Analysis ─────────────────────────────────────

export function parseRevenueData(faturamentoDetalhado: string | null): { month: string; value: number }[] {
  if (!faturamentoDetalhado) return [];
  // Try to parse "Jan R$100k, Fev R$120k" or "Jan: 100000" patterns
  const items: { month: string; value: number }[] = [];
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const regex = /(Jan|Fev|Mar|Abr|Mai|Jun|Jul|Ago|Set|Out|Nov|Dez)[:\s]*R?\$?\s*([\d.,]+)\s*(k|mil|K)?/gi;
  let match;
  while ((match = regex.exec(faturamentoDetalhado)) !== null) {
    const monthName = months.find(m => m.toLowerCase() === match[1].toLowerCase()) || match[1];
    let val = parseFloat(match[2].replace(/\./g, "").replace(",", "."));
    if (match[3] && (match[3].toLowerCase() === "k" || match[3].toLowerCase() === "mil")) val *= 1000;
    items.push({ month: monthName, value: val });
  }
  return items;
}

// ─── Auto Summary ───────────────────────────────────────────────

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
