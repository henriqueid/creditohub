import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Valida JWT e retorna o user. Se inválido/ausente → throw com 401.
 * Sem auth, qualquer um poderia queimar quota da API externa paga ou usar como proxy.
 */
async function authenticateRequest(req: Request): Promise<{ userId: string; jwt: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Authorization header ausente" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const jwt = authHeader.slice("Bearer ".length);
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autentica request — só users válidos passam
    await authenticateRequest(req);

    const { document } = await req.json();

    if (!document || typeof document !== "string" || document.replace(/\D/g, "").length < 11) {
      return new Response(
        JSON.stringify({ error: "Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanDoc = document.replace(/\D/g, "");

    // Check if external API is configured
    const apiUrl = Deno.env.get("EXTERNAL_CONSULTA_API_URL");
    const apiKey = Deno.env.get("EXTERNAL_CONSULTA_API_KEY");

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({
          status: "not_configured",
          message: "API externa não configurada. Adicione os secrets EXTERNAL_CONSULTA_API_URL e EXTERNAL_CONSULTA_API_KEY.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the request to the external API
    // Adjust path, method, headers and body to match your API contract
    const endpoint = `${apiUrl.replace(/\/$/, "")}/${cleanDoc}`;

    // Mask document in logs to avoid leaking PII
    const maskedDoc = cleanDoc.slice(0, 4) + "***";
    console.log("[consulta-externa] Calling external API for", maskedDoc);

    const externalResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
    });

    if (!externalResponse.ok) {
      const errorBody = await externalResponse.text();
      console.error(`[consulta-externa] External API error [${externalResponse.status}]: ${errorBody}`);
      return new Response(
        JSON.stringify({
          status: "error",
          message: `Erro na API externa (HTTP ${externalResponse.status})`,
          details: errorBody,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await externalResponse.json();

    return new Response(
      JSON.stringify({ status: "success", result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // authenticateRequest joga uma Response pronta; repassa intacta
    if (error instanceof Response) return error;
    console.error("[consulta-externa] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
