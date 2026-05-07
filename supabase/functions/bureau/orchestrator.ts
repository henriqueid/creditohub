// Orchestrator: decide cache vs consulta, escolhe provider, faz fallback.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import type { BureauAdapter, AdapterResult } from "./adapters/base.ts";
import { mockAdapter } from "./adapters/mock.ts";
import { serasaAdapter } from "./adapters/serasa.ts";
import { boavistaAdapter } from "./adapters/boavista.ts";
import { quodAdapter } from "./adapters/quod.ts";
import { assertivaAdapter } from "./adapters/assertiva.ts";
import type { TipoConsulta, ResponseNormalized } from "./schema.ts";
import { detectarTipoPessoa } from "./adapters/base.ts";

const ADAPTERS: Record<string, BureauAdapter> = {
  mock: mockAdapter,
  serasa: serasaAdapter,
  boavista: boavistaAdapter,
  quod: quodAdapter,
  assertiva: assertivaAdapter,
  // spc, bigdatacorp: TODO
};

const DEFAULT_TTL_DAYS: Record<string, number> = {
  score: 30,
  protestos: 7,
  acoes_judiciais: 30,
  restritivos: 7,
  pendencias_financeiras: 7,
  consultas_recentes: 1,
};

export interface OrchestratorRequest {
  documento: string;
  tipo_consulta: TipoConsulta;
  force_refresh?: boolean;
  provider_id?: string; // forçar provider específico (botão "Testar conexão")
}

export interface OrchestratorResponse {
  cached: boolean;
  provider_type: string | null;
  provider_id: string | null;
  consulta_id: string | null;
  status: AdapterResult["status"];
  data: ResponseNormalized | null;
  error_message?: string;
}

export async function runConsulta(
  supabase: SupabaseClient,
  userId: string,
  tenantId: string,
  req: OrchestratorRequest,
): Promise<OrchestratorResponse> {
  const documento = req.documento.replace(/\D/g, "");
  const tipoPessoa = detectarTipoPessoa(documento);

  // 1. Cache hit?
  if (!req.force_refresh && !req.provider_id) {
    const { data: cached } = await supabase
      .from("bureau_consultas")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("documento", documento)
      .eq("tipo_consulta", req.tipo_consulta)
      .eq("status", "sucesso")
      .gt("validade_ate", new Date().toISOString())
      .order("consultado_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) {
      return {
        cached: true,
        provider_type: cached.provider_type,
        provider_id: cached.provider_id,
        consulta_id: cached.id,
        status: "sucesso",
        data: cached.response_normalized as ResponseNormalized,
      };
    }
  }

  // 2. Buscar TTL configurado
  const { data: ttlSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("tenant_id", tenantId)
    .eq("key", "bureau_cache_ttl_days")
    .maybeSingle();

  const ttlDays =
    (ttlSetting?.value as Record<string, number>)?.[req.tipo_consulta] ??
    DEFAULT_TTL_DAYS[req.tipo_consulta] ??
    7;

  // 3. Selecionar providers candidatos
  let query = supabase
    .from("bureau_providers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("ativo", true)
    .contains("tipos_consulta", [req.tipo_consulta])
    .order("prioridade", { ascending: true });

  if (req.provider_id) {
    query = supabase.from("bureau_providers").select("*").eq("id", req.provider_id);
  }

  const { data: providers, error: provErr } = await query;

  if (provErr || !providers || providers.length === 0) {
    return {
      cached: false,
      provider_type: null,
      provider_id: null,
      consulta_id: null,
      status: "erro",
      data: null,
      error_message: "Nenhum bureau provider configurado para este tipo de consulta.",
    };
  }

  // 4. Tentar providers em ordem (fallback)
  let lastError: AdapterResult | null = null;

  for (const provider of providers) {
    const adapter = ADAPTERS[provider.provider_type];
    if (!adapter) continue;

    let credentials: Record<string, string> = {};
    if (provider.credential_secret_name) {
      const raw = Deno.env.get(provider.credential_secret_name);
      if (raw) {
        try {
          credentials = JSON.parse(raw);
        } catch {
          credentials = { token: raw };
        }
      }
    }

    let result: AdapterResult;
    try {
      result = await adapter.consultar({
        documento,
        tipo_pessoa: tipoPessoa,
        tipos_consulta: [req.tipo_consulta],
        credentials,
        base_url: provider.base_url ?? undefined,
      });
    } catch (e) {
      result = {
        status: "erro",
        raw: null,
        normalized: null,
        error_message: e instanceof Error ? e.message : String(e),
      };
    }

    // Persistir
    const validadeAte =
      result.status === "sucesso"
        ? new Date(Date.now() + ttlDays * 86400000).toISOString()
        : null;

    const { data: inserted } = await supabase
      .from("bureau_consultas")
      .insert({
        tenant_id: tenantId,
        documento,
        tipo_consulta: req.tipo_consulta,
        provider_id: provider.id,
        provider_type: provider.provider_type,
        response_raw: result.raw as object | null,
        response_normalized: result.normalized as object | null,
        status: result.status,
        error_message: result.error_message,
        custo_estimado: result.custo_estimado ?? provider.custo_medio_consulta,
        consultado_por: userId,
        validade_ate: validadeAte,
      })
      .select("id")
      .single();

    if (result.status === "sucesso") {
      // Audit log
      await supabase.from("audit_log").insert({
        tenant_id: tenantId,
        table_name: "bureau_consultas",
        record_id: inserted?.id ?? "",
        action: "bureau_query",
        new_data: { documento, tipo_consulta: req.tipo_consulta, provider: provider.provider_type },
        changed_by: userId,
      });

      return {
        cached: false,
        provider_type: provider.provider_type,
        provider_id: provider.id,
        consulta_id: inserted?.id ?? null,
        status: "sucesso",
        data: result.normalized,
      };
    }

    lastError = result;
  }

  return {
    cached: false,
    provider_type: null,
    provider_id: null,
    consulta_id: null,
    status: lastError?.status ?? "erro",
    data: null,
    error_message: lastError?.error_message ?? "Todos os providers falharam.",
  };
}
