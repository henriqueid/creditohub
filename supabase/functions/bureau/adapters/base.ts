// Interface comum a todos os adapters de bureau.
// Cada provider implementa `consultar()` e devolve o `AdapterResult`
// já com `normalized` no formato unificado (ou null em caso de erro).

export type { BureauAdapter, AdapterRequest, AdapterResult } from "../schema.ts";

// Helper compartilhado: classifica score numérico em faixa AAA-D
export function classificarFaixa(score: number): "AAA" | "AA" | "A" | "B" | "C" | "D" {
  if (score >= 900) return "AAA";
  if (score >= 800) return "AA";
  if (score >= 700) return "A";
  if (score >= 550) return "B";
  if (score >= 350) return "C";
  return "D";
}

// Helper: detecta PF ou PJ pelo tamanho do documento
export function detectarTipoPessoa(documento: string): "PF" | "PJ" {
  const digits = documento.replace(/\D/g, "");
  return digits.length <= 11 ? "PF" : "PJ";
}
