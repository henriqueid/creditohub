import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Valida JWT e retorna o user. Se inválido/ausente → throw com 401.
 * Usa anon key + Authorization header pra auto-validar tokens (Supabase-native).
 */
async function authenticateRequest(req: Request): Promise<{ userId: string; jwt: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Authorization header ausente" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const jwt = authHeader.slice("Bearer ".length);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error } = await client.auth.getUser(jwt);
  if (error || !user) {
    throw new Response(JSON.stringify({ error: "Token inválido" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return { userId: user.id, jwt };
}

/**
 * Busca a chave Anthropic do user autenticado direto do DB (não confia em body).
 */
async function fetchUserAnthropicKey(jwt: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  // RLS garante que só retorna a row do próprio user
  const { data } = await client
    .from("profiles")
    .select("anthropic_api_key")
    .single();
  return data?.anthropic_api_key ?? null;
}

// Minimum required fields per insight type
const requiredFields: Record<string, { fields: string[]; labels: string[] }> = {
  client: {
    fields: ["credit_score", "segmento"],
    labels: ["Score de crédito", "Segmento de atuação"],
  },
  market: {
    fields: ["segmento", "faturamento_medio"],
    labels: ["Segmento de atuação", "Faturamento médio"],
  },
  financial: {
    fields: ["faturamento_medio", "volume_estimado"],
    labels: ["Faturamento médio", "Volume estimado"],
  },
  risk: {
    fields: ["credit_score"],
    labels: ["Score de crédito"],
  },
  summary: {
    fields: ["credit_score", "faturamento_medio"],
    labels: ["Score de crédito", "Faturamento médio"],
  },
};

function checkDataSufficiency(analysisData: any, clientData: any, insightType: string) {
  const req = requiredFields[insightType] || requiredFields.summary;
  const missing: string[] = [];

  for (let i = 0; i < req.fields.length; i++) {
    const field = req.fields[i];
    const val = analysisData?.[field] ?? clientData?.[field];
    if (val === null || val === undefined || val === "" || val === 0) {
      missing.push(req.labels[i]);
    }
  }

  const substantiveFields = [
    "credit_score", "faturamento_medio", "volume_estimado", "receita_liquida",
    "capital_social", "prazo_medio_titulos", "protestos", "pendencias",
    "acoes_judiciais", "historico_pagamentos", "endividamento", "garantias",
    "referencias_bancarias", "referencias_comerciais", "tempo_atividade",
    "margem_liquida", "indice_liquidez", "numero_funcionarios",
  ];
  let filled = 0;
  for (const f of substantiveFields) {
    const v = analysisData?.[f];
    if (v !== null && v !== undefined && v !== "" && v !== 0) filled++;
  }

  const hasSacados = (analysisData?.sacados?.length || 0) > 0;
  const hasSocios = (analysisData?.socios?.length || 0) > 0;
  if (hasSacados) filled++;
  if (hasSocios) filled++;

  return { missing, filledCount: filled, totalPossible: substantiveFields.length + 2 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // 1. Autentica request — só users válidos passam
    const { jwt } = await authenticateRequest(req);

    // 2. Busca chave Anthropic do user autenticado (RLS garante isolamento)
    const userKey = await fetchUserAnthropicKey(jwt);
    const apiKey = userKey || Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "Chave de API da IA não configurada. Acesse Meu Perfil → Configurações de IA para adicionar sua chave Anthropic.",
        no_api_key: true,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Valida body
    const body = await req.json();
    const { analysisData, clientData, insightType } = body;
    if (!analysisData || typeof analysisData !== "object") {
      return new Response(JSON.stringify({ error: "analysisData inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === DATA VALIDATION ===
    const { missing, filledCount, totalPossible } = checkDataSufficiency(analysisData, clientData, insightType);

    if (missing.length > 0) {
      return new Response(JSON.stringify({
        success: false,
        insufficient_data: true,
        missing_fields: missing,
        filled_count: filledCount,
        total_possible: totalPossible,
        message: `Dados insuficientes para gerar esta análise. Campos obrigatórios faltando: ${missing.join(", ")}. Preencha o dossiê com mais informações antes de gerar insights.`,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const coveragePercent = Math.round((filledCount / totalPossible) * 100);
    const lowCoverage = coveragePercent < 25;

    // Build data inventory for the prompt
    const dataInventory: string[] = [];
    const fieldMap: Record<string, string> = {
      credit_score: "Score de crédito",
      faturamento_medio: "Faturamento médio",
      volume_estimado: "Volume estimado",
      receita_liquida: "Receita líquida",
      capital_social: "Capital social",
      prazo_medio_titulos: "Prazo médio dos títulos",
      protestos: "Protestos",
      pendencias: "Pendências",
      acoes_judiciais: "Ações judiciais",
      cheques_sem_fundo: "Cheques sem fundo",
      historico_pagamentos: "Histórico de pagamentos",
      endividamento: "Endividamento",
      garantias: "Garantias",
      referencias_bancarias: "Referências bancárias",
      referencias_comerciais: "Referências comerciais",
      tempo_atividade: "Tempo de atividade",
      margem_liquida: "Margem líquida",
      indice_liquidez: "Índice de liquidez",
      numero_funcionarios: "Número de funcionários",
      restricoes_cnpj: "Restrições CNPJ",
      tipo_imovel_sede: "Tipo imóvel sede",
      modalidade_operacao: "Modalidade de operação",
      analise_faturamento: "Análise de faturamento",
      faturamento_detalhado: "Faturamento detalhado",
      dependencia_clientes: "Dependência de clientes",
      estrutura_financeira: "Estrutura financeira",
      historico_socios: "Histórico dos sócios",
    };

    const availableData: Record<string, any> = {};
    const unavailableFields: string[] = [];

    for (const [key, label] of Object.entries(fieldMap)) {
      const val = analysisData?.[key];
      if (val !== null && val !== undefined && val !== "" && val !== 0) {
        availableData[label] = val;
        dataInventory.push(`✅ ${label}: ${val}`);
      } else {
        unavailableFields.push(label);
      }
    }

    if (analysisData?.sacados?.length > 0) {
      dataInventory.push(`✅ Sacados cadastrados: ${analysisData.sacados.length}`);
      availableData["Sacados"] = analysisData.sacados;
    } else {
      unavailableFields.push("Sacados/Clientes");
    }
    if (analysisData?.socios?.length > 0) {
      dataInventory.push(`✅ Sócios cadastrados: ${analysisData.socios.length}`);
      availableData["Sócios"] = analysisData.socios;
    } else {
      unavailableFields.push("Quadro societário");
    }

    const segmento = clientData?.segmento || analysisData?.segmento;
    const razaoSocial = clientData?.razao_social || "não informado";

    const prompts: Record<string, string> = {
      client: `Analise EXCLUSIVAMENTE os dados disponíveis deste cedente "${razaoSocial}" do segmento "${segmento || "não informado"}".
Baseie cada ponto da sua análise em um dado concreto do dossiê. Se um dado não está disponível, diga claramente "dado não disponível no dossiê" — NÃO faça suposições.`,

      market: `Com base nos dados concretos do cedente "${razaoSocial}" do segmento "${segmento || "não informado"}", analise os aspectos de mercado.
Use APENAS os dados disponíveis no dossiê para contextualizar. NÃO faça análises genéricas de mercado sem ancorá-las nos dados reais.`,

      financial: `Analise os indicadores financeiros EXCLUSIVAMENTE com base nos dados do dossiê de "${razaoSocial}".
Cada conclusão deve citar o dado específico que a sustenta. Se um indicador não foi preenchido, não invente valores — registre como "não disponível".`,

      risk: `Faça uma análise de risco ESTRITAMENTE baseada nos dados do dossiê de "${razaoSocial}".
Cada risco identificado deve ser sustentado por um dado concreto. NÃO liste riscos genéricos sem base nos dados disponíveis.`,

      summary: `Gere um parecer executivo de "${razaoSocial}" baseado EXCLUSIVAMENTE nos dados do dossiê.
Cada afirmação deve citar o dado que a sustenta. Se houver lacunas importantes, liste-as explicitamente como "informação pendente".`,
    };

    const systemPrompt = `Você é um analista de crédito sênior especializado em factoring, securitização e FIDC no mercado brasileiro.

REGRAS ABSOLUTAS:
1. Analise APENAS os dados fornecidos no dossiê. NUNCA invente, suponha ou generalize dados.
2. Cada afirmação sua DEVE citar o dado específico do dossiê que a sustenta.
3. Se um dado não está disponível, diga EXPLICITAMENTE: "⚠️ Dado não disponível no dossiê: [nome do campo]".
4. NÃO faça análises genéricas de mercado ou de setor sem ancorá-las nos dados reais do dossiê.
5. Se os dados são insuficientes para uma conclusão, diga: "Não é possível concluir sem [dado faltante]."
6. Liste ao final quais dados adicionais seriam necessários para uma análise mais completa.

COBERTURA DO DOSSIÊ: ${coveragePercent}% dos campos preenchidos (${filledCount}/${totalPossible}).

DADOS DISPONÍVEIS NO DOSSIÊ:
${dataInventory.join("\n")}

DADOS NÃO DISPONÍVEIS (não fazer suposições sobre estes):
${unavailableFields.map(f => `❌ ${f}`).join("\n")}

Estruture a resposta em markdown com títulos e bullet points.
${lowCoverage ? "\n⚠️ ATENÇÃO: Menos de 25% do dossiê está preenchido. Seja breve e destaque as lacunas mais críticas antes de qualquer conclusão." : ""}`;

    const userPrompt = `${prompts[insightType] || prompts.summary}

Dados completos do dossiê:
${JSON.stringify(availableData, null, 2)}

Dados do cliente:
${JSON.stringify(clientData || {}, null, 2)}`;

    // Anthropic Claude API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: "Chave de API inválida. Verifique sua chave Anthropic em Meu Perfil → Configurações de IA.", invalid_key: true }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes na conta Anthropic." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "Não foi possível gerar insights.";

    return new Response(JSON.stringify({
      success: true,
      content,
      insightType,
      coverage: { filledCount, totalPossible, percent: coveragePercent },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    // authenticateRequest joga uma Response pronta; repassa intacta
    if (e instanceof Response) return e;
    console.error("generate-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
