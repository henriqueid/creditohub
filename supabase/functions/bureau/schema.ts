// Schema unificado retornado por todos os adapters de bureau.
// Cada adapter (Serasa, Boa Vista, Mock, etc.) deve normalizar sua resposta
// para este formato antes de devolver ao orchestrator.

export type TipoConsulta =
  | "score"
  | "protestos"
  | "acoes_judiciais"
  | "restritivos"
  | "pendencias_financeiras"
  | "consultas_recentes";

export type FaixaScore = "AAA" | "AA" | "A" | "B" | "C" | "D" | null;

export interface ScoreData {
  valor: number;          // 0-1000
  faixa: FaixaScore;
  fonte: string;          // ex: "Mock Bureau", "Serasa Score 2.0"
  modelo?: string;        // versão do modelo
}

export interface ProtestoDetalhe {
  cartorio?: string;
  cidade?: string;
  uf?: string;
  data?: string;          // ISO
  valor?: number;
}

export interface ProtestosData {
  quantidade: number;
  valor_total: number;
  detalhes: ProtestoDetalhe[];
}

export interface AcaoJudicialDetalhe {
  numero_processo?: string;
  vara?: string;
  comarca?: string;
  uf?: string;
  natureza?: string;
  valor_causa?: number;
  data_distribuicao?: string;
  polo?: "ativo" | "passivo";
}

export interface AcoesJudiciaisData {
  quantidade: number;
  detalhes: AcaoJudicialDetalhe[];
}

export interface RestritivoDetalhe {
  fonte?: string;        // SPC, Serasa, etc.
  data?: string;
  valor?: number;
  contrato?: string;
  credor?: string;
}

export interface RestritivosData {
  quantidade: number;
  valor_total: number;
  detalhes: RestritivoDetalhe[];
}

export interface PendenciasFinanceirasData {
  quantidade: number;
  valor_total: number;
  detalhes: Array<{
    tipo?: string;
    fonte?: string;
    valor?: number;
    data?: string;
  }>;
}

export interface ConsultasRecentesData {
  quantidade: number;
  periodo_dias: number;
}

export interface ResponseNormalized {
  documento: string;
  tipo_pessoa: "PF" | "PJ";
  consultado_em: string;  // ISO
  score: ScoreData | null;
  protestos: ProtestosData | null;
  acoes_judiciais: AcoesJudiciaisData | null;
  restritivos: RestritivosData | null;
  pendencias_financeiras: PendenciasFinanceirasData | null;
  consultas_recentes: ConsultasRecentesData | null;
}

export interface AdapterRequest {
  documento: string;        // somente dígitos
  tipo_pessoa: "PF" | "PJ";
  tipos_consulta: TipoConsulta[];
  credentials?: Record<string, string>; // do env var, opcional
  base_url?: string;
}

export interface AdapterResult {
  status: "sucesso" | "erro" | "timeout" | "sem_dados";
  raw: unknown;
  normalized: ResponseNormalized | null;
  error_message?: string;
  custo_estimado?: number;
}

export interface BureauAdapter {
  type: string;
  consultar(req: AdapterRequest): Promise<AdapterResult>;
}
