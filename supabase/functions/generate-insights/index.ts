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

    const { analysisData, clientData, insightType } = await req.json();

    const prompts: Record<string, string> = {
      client: `Analise os dados deste cliente/cedente e gere insights detalhados:
- Avaliação geral do perfil de crédito
- Pontos de atenção baseados no score, protestos, pendências
- Comparação com o mercado do segmento "${clientData?.segmento || "não informado"}"
- Recomendações específicas para concessão de crédito
- Fatores de risco e mitigação`,

      market: `Com base no segmento "${clientData?.segmento || "não informado"}" e dados do cliente, gere insights de mercado:
- Panorama atual do setor
- Riscos setoriais e macroeconômicos
- Tendências que podem impactar a capacidade de pagamento
- Concentração de mercado e dependência de clientes
- Sazonalidade e ciclo econômico do setor`,

      financial: `Analise os dados financeiros e gere insights:
- Análise do faturamento médio de R$ ${analysisData?.faturamento_medio || "não informado"}
- Volume estimado de R$ ${analysisData?.volume_estimado || "não informado"} vs. capacidade
- Endividamento e estrutura financeira
- Prazo médio de títulos: ${analysisData?.prazo_medio_titulos || "não informado"} dias
- Sugestão de limite baseada nos indicadores`,

      risk: `Faça uma análise de risco completa:
- Score: ${analysisData?.credit_score || "não informado"}
- Protestos: ${analysisData?.protestos || "nada consta"}
- Pendências: ${analysisData?.pendencias || "nada consta"}
- Ações judiciais: ${analysisData?.acoes_judiciais || "nada consta"}
- Classificação de risco com justificativa
- Mitigantes possíveis
- Recomendação de garantias`,

      summary: `Gere um parecer executivo completo desta análise de crédito, incluindo:
- Resumo do perfil do cedente
- Principais indicadores financeiros
- Pontos fortes e fracos
- Classificação de risco final
- Recomendação fundamentada (aprovar/restringir/reprovar)
- Condições sugeridas (limite, prazo, concentração, garantias)`,
    };

    const systemPrompt = `Você é um analista de crédito sênior com 20 anos de experiência em factoring, securitização e FIDC no mercado brasileiro.
Seus insights devem ser:
- Profundos e específicos (não genéricos)
- Baseados em dados concretos quando disponíveis
- Com linguagem profissional mas acessível
- Estruturados com títulos e bullet points em markdown
- Práticos e acionáveis

Sempre considere o cenário econômico brasileiro atual e regulamentações do setor.`;

    const userPrompt = `${prompts[insightType] || prompts.summary}

Dados completos da análise:
${JSON.stringify({ ...analysisData, client: clientData }, null, 2)}`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
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
    const content = data.choices?.[0]?.message?.content || "Não foi possível gerar insights.";

    return new Response(JSON.stringify({ success: true, content, insightType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
