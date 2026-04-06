import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get threshold from system_settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "followup_stale_days")
      .maybeSingle();

    const staleDays = setting?.value ? Number(setting.value) : 7;

    // Get enabled flag
    const { data: enabledSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "auto_followup_enabled")
      .maybeSingle();

    const enabled = enabledSetting?.value === "true" || enabledSetting?.value === true;
    if (!enabled) {
      return new Response(
        JSON.stringify({ message: "Auto follow-up is disabled", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find deals that haven't been updated in X days and are not in won/lost stages
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - staleDays);

    const { data: staleDeals, error: dealsError } = await supabase
      .from("deals")
      .select("id, title, client_id, responsible, stage_id, updated_at, deal_stages!inner(name, is_won, is_lost)")
      .lt("updated_at", cutoffDate.toISOString())
      .eq("deal_stages.is_won", false)
      .eq("deal_stages.is_lost", false);

    if (dealsError) {
      throw dealsError;
    }

    if (!staleDeals || staleDeals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No stale deals found", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which deals already have a pending followup task (avoid duplicates)
    const dealIds = staleDeals.map((d) => d.id);
    const { data: existingTasks } = await supabase
      .from("crm_tasks")
      .select("deal_id")
      .in("deal_id", dealIds)
      .eq("status", "pending")
      .ilike("title", "%follow-up automático%");

    const dealsWithTask = new Set((existingTasks || []).map((t) => t.deal_id));

    const tasksToCreate = staleDeals
      .filter((d) => !dealsWithTask.has(d.id))
      .map((deal) => {
        const stageName = (deal as any).deal_stages?.name || "desconhecido";
        const daysSinceUpdate = Math.floor(
          (Date.now() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          title: `⏰ Follow-up automático: ${deal.title}`,
          description: `Oportunidade parada no estágio "${stageName}" há ${daysSinceUpdate} dias. Faça contato com o cliente para avançar a negociação.`,
          deal_id: deal.id,
          client_id: deal.client_id,
          assigned_to: deal.responsible || null,
          priority: daysSinceUpdate > staleDays * 2 ? "high" : "medium",
          status: "pending",
          due_date: new Date().toISOString(),
        };
      });

    if (tasksToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("crm_tasks")
        .insert(tasksToCreate);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({
        message: `Created ${tasksToCreate.length} follow-up tasks`,
        created: tasksToCreate.length,
        checked: staleDeals.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
