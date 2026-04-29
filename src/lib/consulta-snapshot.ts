// Snapshot da Consulta CPF/CNPJ — estrutura compartilhada usada para
// popular Prospects, Cedentes e Análises de Crédito sem perder dados.
//
// O snapshot é gerado na tela de Consulta (BrasilAPI + bureau + restritivos)
// e armazenado em `prospects.qualification_data.snapshot`. Ao cadastrar
// um Cedente direto, o mesmo objeto é passado via `location.state.snapshot`
// para o ClientForm, que o usa para criar a análise inicial pré-preenchida.

import { supabase } from "@/integrations/supabase/client";
import type { ExternalConsultaData, ExternalSourceResult } from "@/lib/external-consulta";
import type { BureauResponseNormalized } from "@/lib/bureau-client";

export interface ConsultaSnapshot {
  documento: string;
  tipo: "cpf" | "cnpj";
  // Cadastrais (BrasilAPI/Receita)
  razao_social?: string;
  nome_fantasia?: string;
  data_fundacao?: string;
  segmento?: string;          // CNAE descrição
  cidade?: string;
  estado?: string;
  cep?: string;
  endereco_completo?: string;
  porte?: string;
  natureza_juridica?: string;
  capital_social?: number;
  situacao_cadastral?: string;
  email?: string;
  telefone?: string;
  // Sócios (QSA)
  socios?: Array<{
    nome: string;
    cpf?: string;
    cargo?: string;
    participacao?: number;
  }>;
  // Bureau / Restritivos
  credit_score?: number;
  faixa_score?: string;
  protestos_qtd?: number;
  protestos_valor?: number;
  acoes_judiciais_qtd?: number;
  pendencias_qtd?: number;
  pendencias_valor?: number;
  restritivos_qtd?: number;
  // Texto livre derivado (para popular `credit_analysis`)
  protestos_texto?: string;
  acoes_judiciais_texto?: string;
  pendencias_texto?: string;
  restricoes_cnpj_texto?: string;
  fonte_informacao?: string;
  consultado_em: string;
}

function joinAddr(e?: ExternalConsultaData["endereco"]): string | undefined {
  if (!e) return undefined;
  const parts = [
    [e.tipo_logradouro, e.logradouro].filter(Boolean).join(" "),
    e.numero,
    e.complemento,
    e.bairro,
    e.cidade && e.uf ? `${e.cidade}/${e.uf}` : e.cidade || e.uf,
    e.cep,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

export function buildConsultaSnapshot(args: {
  documento: string;
  externalSources: ExternalSourceResult[];
  bureau?: BureauResponseNormalized | null;
}): ConsultaSnapshot {
  const digits = args.documento.replace(/\D/g, "");
  const tipo: "cpf" | "cnpj" = digits.length > 11 ? "cnpj" : "cpf";

  const ra =
    args.externalSources.find((s) => s.source === "BrasilAPI (Receita Federal)" && s.status === "success")?.data ||
    args.externalSources.find((s) => s.status === "success")?.data;

  const fontes: string[] = [];
  if (ra) fontes.push("Receita Federal (BrasilAPI)");
  if (args.bureau?.score) fontes.push(args.bureau.score.fonte || "Bureau");

  const protestos = args.bureau?.protestos;
  const acoes = args.bureau?.acoes_judiciais;
  const pend = args.bureau?.pendencias_financeiras;
  const restr = args.bureau?.restritivos;
  const protestosArr = ra?.protestos;
  const acoesArr = ra?.acoes_judiciais;
  const pendArr = ra?.pendencias_financeiras;

  const protestosTexto =
    (protestos?.quantidade ?? protestosArr?.length ?? 0) > 0
      ? `${protestos?.quantidade ?? protestosArr!.length} protesto(s)` +
        (protestos?.valor_total ? ` — total R$ ${protestos.valor_total.toLocaleString("pt-BR")}` : "")
      : "Nada consta";

  const acoesTexto =
    (acoes?.quantidade ?? acoesArr?.length ?? 0) > 0
      ? `${acoes?.quantidade ?? acoesArr!.length} ação(ões) judicial(is)`
      : "Nada consta";

  const pendTexto =
    (pend?.quantidade ?? pendArr?.length ?? 0) > 0
      ? `${pend?.quantidade ?? pendArr!.length} pendência(s)` +
        (pend?.valor_total ? ` — total R$ ${pend.valor_total.toLocaleString("pt-BR")}` : "")
      : "Nada consta";

  const restricoesCnpj =
    ra?.situacao_cadastral && ra.situacao_cadastral.toUpperCase() !== "ATIVA"
      ? `${ra.situacao_cadastral}${ra.descricao_motivo_situacao ? ` — ${ra.descricao_motivo_situacao}` : ""}`
      : "Nada consta";

  return {
    documento: digits,
    tipo,
    razao_social: ra?.razao_social,
    nome_fantasia: ra?.nome_fantasia,
    data_fundacao: ra?.data_abertura,
    segmento: ra?.cnae_descricao,
    cidade: ra?.endereco?.cidade,
    estado: ra?.endereco?.uf,
    cep: ra?.endereco?.cep,
    endereco_completo: joinAddr(ra?.endereco),
    porte: ra?.porte,
    natureza_juridica: ra?.natureza_juridica,
    capital_social: ra?.capital_social,
    situacao_cadastral: ra?.situacao_cadastral,
    email: ra?.email,
    telefone: ra?.telefone_1,
    socios: ra?.socios?.map((s) => ({
      nome: s.nome,
      cpf: s.cpf_cnpj,
      cargo: s.qualificacao,
    })),
    credit_score: args.bureau?.score?.valor,
    faixa_score: args.bureau?.score?.faixa ?? undefined,
    protestos_qtd: protestos?.quantidade ?? protestosArr?.length,
    protestos_valor: protestos?.valor_total,
    acoes_judiciais_qtd: acoes?.quantidade ?? acoesArr?.length,
    pendencias_qtd: pend?.quantidade ?? pendArr?.length,
    pendencias_valor: pend?.valor_total,
    restritivos_qtd: restr?.quantidade,
    protestos_texto: protestosTexto,
    acoes_judiciais_texto: acoesTexto,
    pendencias_texto: pendTexto,
    restricoes_cnpj_texto: restricoesCnpj,
    fonte_informacao: fontes.join(" + ") || undefined,
    consultado_em: new Date().toISOString(),
  };
}

/** Mapeia o snapshot para o payload de `credit_analysis` (campos pré-preenchidos). */
export function snapshotToCreditAnalysis(snap: ConsultaSnapshot): Record<string, unknown> {
  return {
    credit_score: snap.credit_score ?? null,
    capital_social: snap.capital_social ?? null,
    protestos: snap.protestos_texto,
    acoes_judiciais: snap.acoes_judiciais_texto,
    pendencias: snap.pendencias_texto,
    restricoes_cnpj: snap.restricoes_cnpj_texto,
    fonte_informacao: snap.fonte_informacao,
    tempo_atividade: snap.data_fundacao
      ? `Desde ${snap.data_fundacao}`
      : null,
    observacoes_credito: [
      snap.porte && `Porte: ${snap.porte}`,
      snap.natureza_juridica && `Natureza: ${snap.natureza_juridica}`,
      snap.situacao_cadastral && `Situação: ${snap.situacao_cadastral}`,
      snap.endereco_completo && `Endereço: ${snap.endereco_completo}`,
    ]
      .filter(Boolean)
      .join(" • ") || null,
  };
}

/** Cria sócios na análise a partir do QSA do snapshot. */
export async function insertSnapshotSocios(creditAnalysisId: string, snap: ConsultaSnapshot) {
  if (!snap.socios || snap.socios.length === 0) return;
  const rows = snap.socios.map((s) => ({
    credit_analysis_id: creditAnalysisId,
    nome: s.nome,
    cpf: s.cpf?.replace(/\D/g, "") || null,
    cargo: s.cargo || null,
    participacao: s.participacao ?? null,
  }));
  await supabase.from("credit_analysis_socios").insert(rows);
}

/** Mapeia o snapshot para o payload de `clients`. */
export function snapshotToClient(snap: ConsultaSnapshot): Record<string, unknown> {
  return {
    cnpj_cpf: snap.documento,
    razao_social: snap.razao_social || `Cedente ${snap.documento}`,
    nome_fantasia: snap.nome_fantasia || null,
    data_fundacao: snap.data_fundacao || null,
    segmento: snap.segmento || null,
    cidade: snap.cidade || null,
    estado: snap.estado || null,
  };
}
