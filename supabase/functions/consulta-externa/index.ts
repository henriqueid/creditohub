import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log(`[consulta-externa] Calling external API: ${endpoint}`);

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
    console.error("[consulta-externa] Error:", error);
    return new Response(
      JSON.stringify({ status: "error", message: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
