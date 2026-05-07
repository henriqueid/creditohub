// Edge Function: monitoring-runner
// Processa monitoring_groups ativos com next_run_at <= now(), por tenant.
// Invocação restrita: apenas chamadas com header x-cron-secret válido OU service_role JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const MAX_CLIENTS_PER_RUN = 500;

function frequencyToInterval(freq: string): number {
  // retorna minutos
  switch ((freq || "").toLowerCase()) {
    case "hourly":
      return 60;
    case "daily":
      return 60 * 24;
    case "weekly":
      return 60 * 24 * 7;
    case "monthly":
      return 60 * 24 * 30;
    default:
      return 60 * 24;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- AUTH: aceita APENAS service_role ou x-cron-secret (chamada via cron interno).
    // ANON_KEY é público e qualquer authenticated user poderia disparar — não aceitar.
    const authHeader = req.headers.get("Authorization") || "";
    const cronSecretHeader = req.headers.get("x-cron-secret") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cronSecret = Deno.env.get("CRON_SECRET");

    const isService = authHeader === `Bearer ${serviceKey}`;
    const isCron = cronSecret && cronSecretHeader === cronSecret;
    if (!isService && !isCron) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

    // --- 1. Tenants ativos ---
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, nome")
      .eq("ativo", true);
    if (tenantsError) throw tenantsError;

    const summary = {
      tenants_processed: 0,
      groups_processed: 0,
      clients_checked: 0,
      alerts_generated: 0,
      details: [] as Array<Record<string, unknown>>,
    };

    let totalClientsBudget = MAX_CLIENTS_PER_RUN;

    for (const tenant of tenants || []) {
      if (totalClientsBudget <= 0) break;
      summary.tenants_processed++;

      // 2. Grupos due deste tenant
      const { data: groups } = await supabase
        .from("monitoring_groups")
        .select("*")
        .eq("tenant_id", tenant.id)
        .eq("is_active", true)
        .or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);

      if (!groups || groups.length === 0) continue;

      for (const group of groups) {
        if (totalClientsBudget <= 0) break;
        summary.groups_processed++;
        let groupAlerts = 0;

        // 3. Clientes do grupo (limitado pelo budget)
        const { data: links } = await supabase
          .from("monitoring_group_clients")
          .select("client_id")
          .eq("group_id", group.id)
          .eq("tenant_id", tenant.id)
          .limit(totalClientsBudget);

        const clientIds = (links || []).map((l: any) => l.client_id);
        if (clientIds.length === 0) {
          // ainda assim atualiza schedule
        } else {
          totalClientsBudget -= clientIds.length;
          summary.clients_checked += clientIds.length;

          // Carrega clients (precisamos de documento para checar blacklist/falência)
          const { data: clients } = await supabase
            .from("clients")
            .select("id, cnpj_cpf, razao_social")
            .in("id", clientIds)
            .eq("tenant_id", tenant.id);

          const clientsByDoc = new Map<string, any>();
          (clients || []).forEach((c: any) => clientsByDoc.set(c.cnpj_cpf, c));
          const docs = Array.from(clientsByDoc.keys());

          // 3a. Blacklist
          const { data: bl } = await supabase
            .from("blacklist")
            .select("documento, motivo")
            .eq("tenant_id", tenant.id)
            .in("documento", docs);

          // 3b. Bankruptcy
          const { data: bk } = await supabase
            .from("bankruptcy_records")
            .select("document, company_name, status")
            .eq("tenant_id", tenant.id)
            .in("document", docs);

          // 3c. NFs com atraso (com base em data_emissao + limiar_atraso_dias)
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - (group.limiar_atraso_dias ?? 5));
          const { data: invoices } = await supabase
            .from("monitored_invoices")
            .select("client_id, numero_nf, valor, data_emissao, validation_status")
            .eq("tenant_id", tenant.id)
            .in("client_id", clientIds)
            .lt("data_emissao", cutoff.toISOString().slice(0, 10))
            .neq("validation_status", "validated");

          const alertsToInsert: any[] = [];

          for (const b of bl || []) {
            const c = clientsByDoc.get(b.documento);
            if (!c) continue;
            alertsToInsert.push({
              tenant_id: tenant.id,
              client_id: c.id,
              activity_type: "alerta_monitoramento",
              description: `[Grupo: ${group.name}] Blacklist — motivo: ${b.motivo ?? "n/d"}`,
              created_by: "monitoring-runner",
            });
          }
          for (const r of bk || []) {
            const c = clientsByDoc.get(r.document);
            if (!c) continue;
            alertsToInsert.push({
              tenant_id: tenant.id,
              client_id: c.id,
              activity_type: "alerta_monitoramento",
              description: `[Grupo: ${group.name}] Registro falimentar (${r.status}) — ${r.company_name}`,
              created_by: "monitoring-runner",
            });
          }
          for (const inv of invoices || []) {
            alertsToInsert.push({
              tenant_id: tenant.id,
              client_id: inv.client_id,
              activity_type: "alerta_monitoramento",
              description: `[Grupo: ${group.name}] NF ${inv.numero_nf} em atraso (>${group.limiar_atraso_dias}d) — valor ${inv.valor}`,
              created_by: "monitoring-runner",
            });
          }

          if (alertsToInsert.length > 0) {
            const { error: insErr } = await supabase
              .from("activities")
              .insert(alertsToInsert);
            if (!insErr) {
              groupAlerts = alertsToInsert.length;
              summary.alerts_generated += groupAlerts;
            }
          }
        }

        // 4. Atualiza schedule do grupo
        const intervalMin = frequencyToInterval(group.frequency);
        const nextRun = new Date(Date.now() + intervalMin * 60 * 1000);
        await supabase
          .from("monitoring_groups")
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
          })
          .eq("id", group.id)
          .eq("tenant_id", tenant.id);

        summary.details.push({
          tenant_id: tenant.id,
          group_id: group.id,
          group_name: group.name,
          alerts: groupAlerts,
          next_run_at: nextRun.toISOString(),
        });
      }

      // 5. Audit log resumido por tenant
      await supabase.from("audit_log").insert({
        tenant_id: tenant.id,
        table_name: "monitoring_groups",
        record_id: "runner",
        action: "monitoring_run",
        new_data: {
          groups: (groups || []).length,
          alerts: summary.alerts_generated,
          at: new Date().toISOString(),
        },
      });
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("monitoring-runner error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
