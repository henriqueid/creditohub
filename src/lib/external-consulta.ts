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
  descricao_motivo_situacao?: string;
  data_situacao?: string;
  natureza_juridica?: string;
  porte?: string;
  capital_social?: number;
  data_abertura?: string;
  cnae_principal?: string;
  cnae_descricao?: string;
  endereco?: {
    tipo_logradouro?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };

  // Telefones
  telefone_1?: string;
  telefone_2?: string;
  fax?: string;
  email?: string;

  // Matriz/Filial
  identificador_matriz_filial?: string; // "MATRIZ" | "FILIAL"

  // CNAEs secundários
  cnaes_secundarios?: Array<{
    codigo: string;
    descricao: string;
  }>;

  // Simples Nacional / MEI
  opcao_simples?: boolean | null;
  data_opcao_simples?: string | null;
  data_exclusao_simples?: string | null;
  opcao_mei?: boolean | null;
  data_opcao_mei?: string | null;
  data_exclusao_mei?: string | null;

  // Regime Tributário (histórico)
  regime_tributario?: Array<{
    ano: number;
    forma_tributacao: string;
  }>;

  // Sócios (from external)
  socios?: Array<{
    nome: string;
    cpf_cnpj?: string;
    qualificacao?: string;
    data_entrada?: string;
    faixa_etaria?: string;
    representante_legal?: string;
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
 */
export async function fetchExternalConsulta(document: string): Promise<ExternalSourceResult[]> {
  const results: ExternalSourceResult[] = [];
  console.log("[fetchExternalConsulta] Starting for document:", document);
  // --- Source 1: Your custom REST API ---
  try {
    const { data, error } = await supabase.functions.invoke("consulta-externa", {
      body: { document },
    });

    if (error) {
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

  // --- Source 2: BrasilAPI (free, no key needed) — CNPJ only ---
  const cleanDoc = document.replace(/\D/g, "");
  if (cleanDoc.length === 14) {
    try {
      console.log("[fetchExternalConsulta] Calling BrasilAPI for CNPJ:", cleanDoc);
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanDoc}`);
      if (response.ok) {
        const raw = await response.json();

        // Format phone numbers
        const formatPhone = (ddd: string, num: string) => {
          if (!ddd && !num) return undefined;
          const clean = `${ddd || ""}${num || ""}`.replace(/\D/g, "");
          return clean.length > 0 ? clean : undefined;
        };

        const mappedData: ExternalConsultaData = {
          // Cadastral
          razao_social: raw.razao_social,
          nome_fantasia: raw.nome_fantasia,
          situacao_cadastral: raw.descricao_situacao_cadastral,
          descricao_motivo_situacao: raw.descricao_motivo_situacao_cadastral,
          data_situacao: raw.data_situacao_cadastral,
          natureza_juridica: raw.natureza_juridica,
          porte: raw.porte,
          capital_social: raw.capital_social,
          data_abertura: raw.data_inicio_atividade,
          cnae_principal: raw.cnae_fiscal?.toString(),
          cnae_descricao: raw.cnae_fiscal_descricao,

          // Endereço
          endereco: {
            tipo_logradouro: raw.descricao_tipo_de_logradouro,
            logradouro: raw.logradouro,
            numero: raw.numero,
            complemento: raw.complemento,
            bairro: raw.bairro,
            cidade: raw.municipio,
            uf: raw.uf,
            cep: raw.cep,
          },

          // Telefones
          telefone_1: formatPhone(raw.ddd_telefone_1, ""),
          telefone_2: formatPhone(raw.ddd_telefone_2, ""),
          fax: formatPhone(raw.ddd_fax, ""),
          email: raw.email || undefined,

          // Matriz/Filial
          identificador_matriz_filial: raw.descricao_identificador_matriz_filial,

          // CNAEs secundários
          cnaes_secundarios: raw.cnaes_secundarios?.map((c: any) => ({
            codigo: c.codigo?.toString(),
            descricao: c.descricao,
          })) || [],

          // Simples Nacional / MEI
          opcao_simples: raw.opcao_pelo_simples,
          data_opcao_simples: raw.data_opcao_pelo_simples,
          data_exclusao_simples: raw.data_exclusao_do_simples,
          opcao_mei: raw.opcao_pelo_mei,
          data_opcao_mei: raw.data_opcao_pelo_mei,
          data_exclusao_mei: raw.data_exclusao_do_mei,

          // Regime Tributário
          regime_tributario: raw.regime_tributario?.map((r: any) => ({
            ano: r.ano,
            forma_tributacao: r.forma_de_tributacao,
          })) || [],

          // Sócios (QSA)
          socios: raw.qsa?.map((s: any) => ({
            nome: s.nome_socio,
            cpf_cnpj: s.cnpj_cpf_do_socio,
            qualificacao: s.qualificacao_socio,
            data_entrada: s.data_entrada_sociedade,
            faixa_etaria: s.faixa_etaria,
            representante_legal: s.nome_representante_legal || undefined,
          })) || [],
        };

        results.push({
          source: "BrasilAPI (Receita Federal)",
          status: "success",
          data: mappedData,
          message: "Dados públicos da Receita Federal via BrasilAPI (gratuito)",
        });
      } else {
        results.push({
          source: "BrasilAPI (Receita Federal)",
          status: "error",
          message: response.status === 404 ? "CNPJ não encontrado na Receita Federal" : `Erro HTTP ${response.status}`,
        });
      }
    } catch {
      results.push({
        source: "BrasilAPI (Receita Federal)",
        status: "error",
        message: "Falha na comunicação com BrasilAPI",
      });
    }
  } else {
    results.push({
      source: "BrasilAPI (Receita Federal)",
      status: "not_configured",
      message: "Disponível apenas para CNPJ (14 dígitos)",
    });
  }

  // --- Source 3: Placeholder for Bureau de Crédito ---
  results.push({
    source: "Serasa / Bureau",
    status: "not_configured",
    message: "Integração não configurada",
  });

  return results;
}
