// Service layer for external CPF/CNPJ consultation via custom REST API
// Ready to integrate — just configure the EXTERNAL_CONSULTA_API_URL and EXTERNAL_CONSULTA_API_KEY secrets

import { supabase } from "@/integrations/supabase/client";

export interface ExternalSourceResult {
  source: string;
  status: "success" | "error" | "pending" | "not_configured";
  data?: ExternalConsultaData | null;
  message?: string;
}

// Standardized response shape from external API
export interface ExternalConsultaData {
  // Cadastral
  razao_social?: string;
  nome_fantasia?: string;
  situacao_cadastral?: string;
  data_situacao?: string;
  natureza_juridica?: string;
  porte?: string;
  capital_social?: number;
  data_abertura?: string;
  cnae_principal?: string;
  cnae_descricao?: string;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };

  // Sócios (from external)
  socios?: Array<{
    nome: string;
    cpf_cnpj?: string;
    qualificacao?: string;
    data_entrada?: string;
  }>;

  // Credit / Score
  score?: number;
  score_descricao?: string;
  probabilidade_inadimplencia?: number;
  classe_risco?: string;

  // Restritivos
  protestos?: Array<{
    cartorio?: string;
    valor?: number;
    data?: string;
    cidade?: string;
  }>;
  pendencias_financeiras?: Array<{
    tipo?: string;
    valor?: number;
    data?: string;
    credor?: string;
  }>;
  cheques_sem_fundo?: Array<{
    banco?: string;
    quantidade?: number;
    data_ultima?: string;
  }>;
  acoes_judiciais?: Array<{
    tipo?: string;
    vara?: string;
    valor?: number;
    data?: string;
  }>;

  // Receita Federal
  receita_federal?: {
    situacao?: string;
    data_consulta?: string;
    qsa?: Array<{ nome: string; qualificacao: string }>;
  };

  // Custom fields from your API
  [key: string]: unknown;
}

/**
 * Fetches external consultation data via the edge function proxy.
 * The edge function calls your custom REST API.
 * 
 * When ready to connect:
 * 1. Add secret EXTERNAL_CONSULTA_API_URL (your API base URL)
 * 2. Add secret EXTERNAL_CONSULTA_API_KEY (your API auth key)
 * 3. The edge function will proxy requests securely
 */
export async function fetchExternalConsulta(document: string): Promise<ExternalSourceResult[]> {
  const results: ExternalSourceResult[] = [];

  // --- Source 1: Your custom REST API ---
  try {
    const { data, error } = await supabase.functions.invoke("consulta-externa", {
      body: { document },
    });

    if (error) {
      // If edge function returns not_configured, show as pending
      if (error.message?.includes("not_configured") || data?.status === "not_configured") {
        results.push({
          source: "API Própria",
          status: "not_configured",
          message: "API externa não configurada. Adicione as chaves EXTERNAL_CONSULTA_API_URL e EXTERNAL_CONSULTA_API_KEY.",
        });
      } else {
        results.push({
          source: "API Própria",
          status: "error",
          message: error.message || "Erro ao consultar API externa",
        });
      }
    } else if (data?.status === "not_configured") {
      results.push({
        source: "API Própria",
        status: "not_configured",
        message: "API externa não configurada. Configure as credenciais para ativar.",
      });
    } else {
      results.push({
        source: "API Própria",
        status: "success",
        data: data?.result as ExternalConsultaData,
        message: "Dados retornados com sucesso",
      });
    }
  } catch {
    results.push({
      source: "API Própria",
      status: "error",
      message: "Falha na comunicação com o serviço",
    });
  }

  // --- Source 2: Placeholder for Receita Federal ---
  results.push({
    source: "Receita Federal",
    status: "not_configured",
    message: "Integração não configurada",
  });

  // --- Source 3: Placeholder for Bureau de Crédito ---
  results.push({
    source: "Serasa / Bureau",
    status: "not_configured",
    message: "Integração não configurada",
  });

  return results;
}
