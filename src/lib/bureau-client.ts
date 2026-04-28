// Cliente frontend para a Edge Function `bureau`.
// Centraliza chamadas e tipagem do schema normalizado.

import { supabase } from "@/integrations/supabase/client";

export type TipoConsulta =
  | "score"
  | "protestos"
  | "acoes_judiciais"
  | "restritivos"
  | "pendencias_financeiras"
  | "consultas_recentes";

export type FaixaScore = "AAA" | "AA" | "A" | "B" | "C" | "D" | null;

export interface ScoreData {
  valor: number;
  faixa: FaixaScore;
  fonte: string;
  modelo?: string;
}

export interface ProtestosData {
  quantidade: number;
  valor_total: number;
  detalhes: Array<{ cartorio?: string; cidade?: string; uf?: string; data?: string; valor?: number }>;
}

export interface AcoesJudiciaisData {
  quantidade: number;
  detalhes: Array<{
    numero_processo?: string;
    vara?: string;
    comarca?: string;
    uf?: string;
    natureza?: string;
    valor_causa?: number;
    data_distribuicao?: string;
    polo?: "ativo" | "passivo";
  }>;
}

export interface RestritivosData {
  quantidade: number;
  valor_total: number;
  detalhes: Array<{ fonte?: string; data?: string; valor?: number; credor?: string; contrato?: string }>;
}

export interface PendenciasFinanceirasData {
  quantidade: number;
  valor_total: number;
  detalhes: Array<{ tipo?: string; fonte?: string; valor?: number; data?: string }>;
}

export interface ConsultasRecentesData {
  quantidade: number;
  periodo_dias: number;
}

export interface BureauResponseNormalized {
  documento: string;
  tipo_pessoa: "PF" | "PJ";
  consultado_em: string;
  score: ScoreData | null;
  protestos: ProtestosData | null;
  acoes_judiciais: AcoesJudiciaisData | null;
  restritivos: RestritivosData | null;
  pendencias_financeiras: PendenciasFinanceirasData | null;
  consultas_recentes: ConsultasRecentesData | null;
}

export interface BureauOrchestratorResponse {
  cached: boolean;
  provider_type: string | null;
  provider_id: string | null;
  consulta_id: string | null;
  status: "sucesso" | "erro" | "timeout" | "sem_dados";
  data: BureauResponseNormalized | null;
  error_message?: string;
}

export async function consultarBureau(
  documento: string,
  tipo_consulta: TipoConsulta,
  options?: { force_refresh?: boolean; provider_id?: string },
): Promise<BureauOrchestratorResponse> {
  const { data, error } = await supabase.functions.invoke<BureauOrchestratorResponse>("bureau", {
    body: {
      documento: documento.replace(/\D/g, ""),
      tipo_consulta,
      force_refresh: options?.force_refresh ?? false,
      provider_id: options?.provider_id,
    },
  });

  if (error) {
    return {
      cached: false,
      provider_type: null,
      provider_id: null,
      consulta_id: null,
      status: "erro",
      data: null,
      error_message: error.message,
    };
  }

  return data!;
}
