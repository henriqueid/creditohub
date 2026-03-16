import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatDate, formatCNPJorCPF, recommendationLabels, statusLabels } from "@/lib/formatters";

interface PrintData {
  analysis: any;
  client: any;
  sacados: any[];
  socios: any[];
}

export async function fetchPrintData(analysisId: string): Promise<PrintData> {
  const [analysisRes, sacadosRes, sociosRes] = await Promise.all([
    supabase.from("credit_analysis").select("*, clients(*)").eq("id", analysisId).single(),
    supabase.from("credit_analysis_sacados").select("*").eq("credit_analysis_id", analysisId),
    supabase.from("credit_analysis_socios").select("*").eq("credit_analysis_id", analysisId),
  ]);

  if (analysisRes.error) throw analysisRes.error;

  return {
    analysis: analysisRes.data,
    client: (analysisRes.data as any).clients,
    sacados: sacadosRes.data || [],
    socios: sociosRes.data || [],
  };
}

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "—";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function field(label: string, value: string | null | undefined): string {
  return `<div class="field"><span class="label">${label}</span><span class="value">${escapeHtml(value)}</span></div>`;
}

export function generatePrintHtml(data: PrintData): string {
  const { analysis: a, client: c, sacados, socios } = data;

  const sacadosRows = sacados.map(s => `
    <tr>
      <td>${escapeHtml(s.sacado_nome)}</td>
      <td class="num">${s.percentual_faturamento != null ? `${s.percentual_faturamento}%` : "—"}</td>
      <td class="num">${s.prazo_medio != null ? `${s.prazo_medio} dias` : "—"}</td>
    </tr>
  `).join("");

  const sociosRows = socios.map(s => `
    <tr>
      <td>${escapeHtml(s.nome)}</td>
      <td>${escapeHtml(s.cpf)}</td>
      <td class="num">${s.participacao != null ? `${s.participacao}%` : "—"}</td>
      <td>${escapeHtml(s.cargo)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Crédito — ${c?.razao_social || "Cedente"}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a1a; padding: 20mm 15mm; line-height: 1.5; }
    
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; font-weight: 700; }
    .header .meta { text-align: right; font-size: 10px; color: #555; }
    .header .status { display: inline-block; padding: 2px 8px; border: 1px solid #333; border-radius: 3px; font-size: 10px; font-weight: 600; margin-top: 4px; }

    .section { margin-bottom: 16px; page-break-inside: avoid; }
    .section h2 { font-size: 13px; font-weight: 700; background: #f0f0f0; padding: 4px 8px; margin-bottom: 8px; border-left: 3px solid #333; }
    
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
    .fields.cols-3 { grid-template-columns: 1fr 1fr 1fr; }
    .field { display: flex; gap: 6px; padding: 2px 0; }
    .field .label { font-weight: 600; color: #555; white-space: nowrap; min-width: 140px; }
    .field .value { color: #1a1a1a; }
    .field.full { grid-column: 1 / -1; }
    .field.full .value { white-space: pre-wrap; }

    table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px; }
    th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }

    .text-block { margin-top: 4px; padding: 6px 8px; background: #fafafa; border: 1px solid #eee; border-radius: 2px; white-space: pre-wrap; font-size: 10.5px; }

    .recommendation { display: inline-block; padding: 3px 12px; font-weight: 700; font-size: 12px; border: 2px solid #333; border-radius: 4px; margin-top: 8px; }

    .footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 9px; color: #888; }

    @media print {
      body { padding: 10mm; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Relatório de Análise de Crédito</h1>
      <p>${escapeHtml(c?.razao_social)} — ${c ? formatCNPJorCPF(c.cnpj_cpf) : "—"}</p>
    </div>
    <div class="meta">
      <div>Data: ${formatDate(a.data_analise)}</div>
      <div>Analista: ${escapeHtml(a.analista_credito)}</div>
      <div class="status">${statusLabels[a.status] || a.status}</div>
    </div>
  </div>

  <!-- Identificação -->
  <div class="section">
    <h2>1. Identificação do Cliente</h2>
    <div class="fields">
      ${field("Razão Social", c?.razao_social)}
      ${field("CNPJ/CPF", c ? formatCNPJorCPF(c.cnpj_cpf) : null)}
      ${field("Nome Fantasia", c?.nome_fantasia)}
      ${field("Segmento", c?.segmento)}
      ${field("Cidade/UF", [c?.cidade, c?.estado].filter(Boolean).join("/") || null)}
      ${field("Data Fundação", c?.data_fundacao ? formatDate(c.data_fundacao) : null)}
      ${field("Resp. Comercial", a.responsavel_comercial)}
      ${field("Analista", a.analista_credito)}
    </div>
  </div>

  <!-- Operacional -->
  <div class="section">
    <h2>2. Informações Operacionais</h2>
    <div class="fields cols-3">
      ${field("Faturamento Médio", formatBRL(a.faturamento_medio))}
      ${field("Volume Estimado", formatBRL(a.volume_estimado))}
      ${field("Prazo Médio Títulos", a.prazo_medio_titulos ? `${a.prazo_medio_titulos} dias` : null)}
    </div>
    ${sacados.length > 0 ? `
      <p style="margin-top:10px; font-weight:600; font-size:11px;">Principais Sacados</p>
      <table>
        <thead><tr><th>Sacado</th><th>% Faturamento</th><th>Prazo Médio</th></tr></thead>
        <tbody>${sacadosRows}</tbody>
      </table>
    ` : ""}
  </div>

  <!-- Estrutura Societária -->
  <div class="section">
    <h2>3. Estrutura Societária</h2>
    ${socios.length > 0 ? `
      <table>
        <thead><tr><th>Nome</th><th>CPF</th><th>Participação</th><th>Cargo</th></tr></thead>
        <tbody>${sociosRows}</tbody>
      </table>
    ` : "<p>Nenhum sócio registrado.</p>"}
    ${a.historico_socios ? `
      <p style="margin-top:8px; font-weight:600; font-size:11px;">Histórico Empresarial</p>
      <div class="text-block">${escapeHtml(a.historico_socios)}</div>
    ` : ""}
  </div>

  <!-- Consulta de Crédito -->
  <div class="section">
    <h2>4. Consulta de Crédito</h2>
    <div class="fields">
      ${field("Score de Crédito", a.credit_score?.toString())}
      ${field("Protestos", a.protestos)}
      ${field("Pendências", a.pendencias)}
      ${field("Cheques sem Fundo", a.cheques_sem_fundo)}
      ${field("Ações Judiciais", a.acoes_judiciais)}
    </div>
    ${a.observacoes_credito ? `
      <p style="margin-top:8px; font-weight:600; font-size:11px;">Observações</p>
      <div class="text-block">${escapeHtml(a.observacoes_credito)}</div>
    ` : ""}
  </div>

  <!-- Análise Financeira -->
  <div class="section">
    <h2>5. Análise Financeira</h2>
    ${a.analise_faturamento ? `<p style="font-weight:600;">Análise de Faturamento</p><div class="text-block">${escapeHtml(a.analise_faturamento)}</div>` : ""}
    ${a.estrutura_financeira ? `<p style="font-weight:600; margin-top:8px;">Estrutura Financeira</p><div class="text-block">${escapeHtml(a.estrutura_financeira)}</div>` : ""}
    ${a.endividamento ? `<p style="font-weight:600; margin-top:8px;">Endividamento</p><div class="text-block">${escapeHtml(a.endividamento)}</div>` : ""}
    ${a.dependencia_clientes ? `<p style="font-weight:600; margin-top:8px;">Dependência de Clientes</p><div class="text-block">${escapeHtml(a.dependencia_clientes)}</div>` : ""}
  </div>

  <!-- Riscos e Positivos -->
  <div class="section">
    <h2>6. Riscos e Pontos Positivos</h2>
    ${a.riscos ? `<p style="font-weight:600;">Riscos Identificados</p><div class="text-block">${escapeHtml(a.riscos)}</div>` : ""}
    ${a.pontos_positivos ? `<p style="font-weight:600; margin-top:8px;">Pontos Positivos</p><div class="text-block">${escapeHtml(a.pontos_positivos)}</div>` : ""}
  </div>

  <!-- Operação Proposta -->
  <div class="section">
    <h2>7. Operação Proposta</h2>
    <div class="fields cols-3">
      ${field("Limite Sugerido", formatBRL(a.limite_sugerido))}
      ${field("Prazo Médio Permitido", a.prazo_medio_permitido ? `${a.prazo_medio_permitido} dias` : null)}
      ${field("Concentração Máxima", a.concentracao_maxima ? `${a.concentracao_maxima}%` : null)}
    </div>
    ${a.garantias ? `<p style="font-weight:600; margin-top:8px;">Garantias</p><div class="text-block">${escapeHtml(a.garantias)}</div>` : ""}
  </div>

  <!-- Parecer -->
  <div class="section">
    <h2>8. Parecer do Analista</h2>
    ${a.parecer_analista ? `<div class="text-block">${escapeHtml(a.parecer_analista)}</div>` : "<p>Nenhum parecer registrado.</p>"}
    ${a.recommendation ? `<div style="margin-top:10px;"><span style="font-weight:600;">Recomendação:</span> <span class="recommendation">${recommendationLabels[a.recommendation] || a.recommendation}</span></div>` : ""}
  </div>

  <div class="footer">
    <span>Documento gerado em ${new Date().toLocaleString("pt-BR")}</span>
    <span>CréditoHub — Relatório de Análise de Crédito</span>
  </div>
</body>
</html>`;
}

export function openPrintWindow(html: string) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup bloqueado. Permita popups para gerar o PDF.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
  };
}
