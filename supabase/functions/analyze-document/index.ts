import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { fileName, fileContent, section, analysisContext } = await req.json();

    if (!fileContent) throw new Error("fileContent is required");

    const systemPrompt = `Você é um analista de crédito sênior especializado em factoring, securitização e FIDC no Brasil.
Analise o documento fornecido e extraia TODAS as informações relevantes para uma análise de crédito.

Retorne um JSON estruturado com os seguintes campos (preencha apenas os que encontrar):
- razao_social: string
- cnpj_cpf: string
- nome_fantasia: string
- segmento: string
- faturamento_medio: number (valor em reais)
- endereco: string
- socios: array de { nome, cpf, participacao, cargo }
- protestos: string (descrição)
- pendencias: string
- score_credito: number
- acoes_judiciais: string
- observacoes: string (informações adicionais relevantes)
- riscos_identificados: string[]
- pontos_positivos: string[]
- resumo_executivo: string (resumo do documento em 2-3 frases)

Se o documento for uma consulta Serasa/SPC/Boa Vista, extraia score, protestos, pendências e ações judiciais.
Se for um balanço/DRE, extraia faturamento, endividamento e estrutura financeira.
Se for contrato social, extraia sócios e estrutura societária.

Seção atual da análise: ${section || "geral"}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Documento: "${fileName || "documento"}"

Contexto da análise atual:
${analysisContext ? JSON.stringify(analysisContext) : "Nenhum contexto disponível"}

Conteúdo do documento (base64 ou texto):
${fileContent.substring(0, 50000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_data",
              description: "Extract structured data from a credit analysis document",
              parameters: {
                type: "object",
                properties: {
                  razao_social: { type: "string" },
                  cnpj_cpf: { type: "string" },
                  nome_fantasia: { type: "string" },
                  segmento: { type: "string" },
                  faturamento_medio: { type: "number" },
                  endereco: { type: "string" },
                  socios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: { type: "string" },
                        cpf: { type: "string" },
                        participacao: { type: "number" },
                        cargo: { type: "string" },
                      },
                    },
                  },
                  protestos: { type: "string" },
                  pendencias: { type: "string" },
                  score_credito: { type: "number" },
                  acoes_judiciais: { type: "string" },
                  observacoes: { type: "string" },
                  riscos_identificados: { type: "array", items: { type: "string" } },
                  pontos_positivos: { type: "array", items: { type: "string" } },
                  resumo_executivo: { type: "string" },
                },
                required: ["resumo_executivo"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_data" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let extracted = {};

    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        extracted = { resumo_executivo: "Não foi possível extrair dados estruturados do documento." };
      }
    }

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
