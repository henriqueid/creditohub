import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { fileName, fileContent, section, analysisContext, anthropic_api_key: userApiKey } = body;

    // Use per-user key if provided, otherwise fall back to server secret
    const apiKey = userApiKey || Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("AI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: "Chave de API da IA não configurada. Acesse Meu Perfil → Configurações de IA para adicionar sua chave Anthropic.",
        no_api_key: true,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!fileContent) throw new Error("fileContent is required");

    const systemPrompt = `Você é um analista de crédito sênior especializado em factoring, securitização e FIDC no Brasil.
Analise o documento fornecido e extraia TODAS as informações relevantes para uma análise de crédito.

Retorne os dados estruturados usando a ferramenta extract_document_data com os campos que encontrar:
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

    const userMessage = `Documento: "${fileName || "documento"}"

Contexto da análise atual:
${analysisContext ? JSON.stringify(analysisContext) : "Nenhum contexto disponível"}

Conteúdo do documento (base64 ou texto):
${fileContent.substring(0, 50000)}`;

    // Anthropic Claude API with tool_use
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        tools: [
          {
            name: "extract_document_data",
            description: "Extract structured data from a credit analysis document",
            input_schema: {
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
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_document_data" },
        messages: [
          { role: "user", content: userMessage },
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
    // Anthropic returns tool_use in content array
    const toolUse = data.content?.find((c: any) => c.type === "tool_use" && c.name === "extract_document_data");
    const extracted = toolUse?.input || { resumo_executivo: "Não foi possível extrair dados estruturados do documento." };

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
