// Edge Function: bureau
// Entry point para consultas a bureaus de crédito (multi-provedor com cache).
//
// Body esperado:
//   { documento: string, tipo_consulta: 'score'|'protestos'|..., force_refresh?: boolean, provider_id?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { runConsulta, OrchestratorRequest } from "./orchestrator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIPOS_VALIDOS = [
  "score",
  "protestos",
  "acoes_judiciais",
  "restritivos",
  "pendencias_financeiras",
  "consultas_recentes",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const userId = user.id;

    const { data: tenantData, error: tenantErr } = await supabase.rpc("get_user_tenant_id", {
      _user_id: userId,
    });
    if (tenantErr || !tenantData) {
      return json({ error: "Tenant não encontrado para o usuário" }, 403);
    }
    const tenantId = tenantData as string;

    let body: Partial<OrchestratorRequest>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body inválido" }, 400);
    }

    if (!body.documento || typeof body.documento !== "string") {
      return json({ error: "Campo 'documento' é obrigatório." }, 400);
    }
    if (!body.tipo_consulta || !TIPOS_VALIDOS.includes(body.tipo_consulta)) {
      return json(
        { error: `Campo 'tipo_consulta' inválido. Use: ${TIPOS_VALIDOS.join(", ")}` },
        400,
      );
    }

    const result = await runConsulta(supabase, userId, tenantId, {
      documento: body.documento,
      tipo_consulta: body.tipo_consulta,
      force_refresh: body.force_refresh ?? false,
      provider_id: body.provider_id,
    });

    return json(result, 200);
  } catch (e) {
    console.error("[bureau] erro:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
