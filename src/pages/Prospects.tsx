import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  UserSearch, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Trash2, Loader2, Briefcase, FileSearch, Building2,
  MapPin, AlertOctagon, Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate } from "@/lib/formatters";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { getQualificationValidityDays } from "@/lib/prospect-qualification";
import {
  snapshotToCreditAnalysis,
  insertSnapshotSocios,
  ensureClientFromSnapshot,
  type ConsultaSnapshot,
} from "@/lib/consulta-snapshot";
import { ANALYSIS_STATUS } from "@/lib/analysis-status";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Prospect {
  id: string;
  documento: string;
  nome: string | null;
  tipo: string;
  qualification_status: string;
  qualification_score: number | null;
  risk_level: string;
  qualification_data: Record<string, any> | null;
  source: string;
  client_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  qualified:     { label: "Qualificado",     color: T.esmeralda },
  not_qualified: { label: "Não qualificado", color: T.danger },
  pending:       { label: "Pendente",        color: T.amber },
};

const RISK_CFG: Record<string, { label: string; color: string }> = {
  low:     { label: "Risco Baixo",  color: T.esmeralda },
  medium:  { label: "Risco Médio",  color: T.amber },
  high:    { label: "Risco Alto",   color: T.danger },
  unknown: { label: "Risco N/A",    color: T.textMute },
};

export default function Prospects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [hidePromoted, setHidePromoted] = useState<boolean>(() => {
    try { return localStorage.getItem("prospects.hidePromoted") === "1"; } catch { return false; }
  });
  const [busyAction, setBusyAction] = useState<{ id: string; action: "pipeline" | "analise" | "discard" } | null>(null);

  const togglePromotedFilter = (v: boolean) => {
    setHidePromoted(v);
    try { localStorage.setItem("prospects.hidePromoted", v ? "1" : "0"); } catch { /* */ }
  };

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Prospect[];
    },
  });

  const { data: validityDays } = useQuery({
    queryKey: ["prospect-validity-days"],
    queryFn: getQualificationValidityDays,
  });

  // Garante client + grava client_id no prospect (vínculo)
  async function ensureClient(prospect: Prospect): Promise<string> {
    const snapshot = (prospect.qualification_data?.snapshot ?? null) as ConsultaSnapshot | null;
    const clientId = await ensureClientFromSnapshot(prospect.documento, snapshot, {
      razao_social: prospect.nome || undefined,
    });
    await supabase.from("prospects").update({ client_id: clientId }).eq("id", prospect.id);
    return clientId;
  }

  // ── Mutations: 3 caminhos do prospect ──────────────────────────────

  // 1. Mover para Pipeline → cria client + deal estágio inicial. NÃO cria análise.
  const moveToPipeline = useMutation({
    mutationFn: async (prospect: Prospect) => {
      setBusyAction({ id: prospect.id, action: "pipeline" });
      const clientId = await ensureClient(prospect);

      const { data: firstStage } = await supabase
        .from("deal_stages").select("id")
        .eq("is_active", true).eq("is_won", false).eq("is_lost", false)
        .order("order").limit(1).single();
      if (!firstStage) throw new Error("Nenhum estágio ativo no Pipeline");

      const dealPayload: Record<string, any> = {
        client_id: clientId,
        stage_id: firstStage.id,
        title: `Oportunidade — ${prospect.nome || prospect.documento}`,
        notes: `Originado do prospect ${prospect.id} · score ${prospect.qualification_score ?? "—"} · ${RISK_CFG[prospect.risk_level]?.label || "risco N/A"}`,
        prospect_id: prospect.id,
      };
      const { error } = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
      if (error) {
        // Se prospect_id ainda não existir na coluna, tenta sem
        delete dealPayload.prospect_id;
        const { error: retry } = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
        if (retry) throw retry;
      }
      return { clientId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Movido para o Pipeline comercial");
      navigate("/crm/pipeline");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao mover para Pipeline"),
    onSettled: () => setBusyAction(null),
  });

  // 2. Iniciar análise direta → cria client + análise draft. NÃO cria deal.
  // Se o cliente já tiver análise em andamento (draft/in_committee), reusa.
  const startAnalysis = useMutation({
    mutationFn: async (prospect: Prospect) => {
      setBusyAction({ id: prospect.id, action: "analise" });
      const clientId = await ensureClient(prospect);
      const snapshot = (prospect.qualification_data?.snapshot ?? null) as ConsultaSnapshot | null;

      const { data: existing } = await supabase
        .from("credit_analysis")
        .select("id")
        .eq("client_id", clientId)
        .in("status", [ANALYSIS_STATUS.draft, ANALYSIS_STATUS.in_committee])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing?.id) return { analysisId: existing.id, reused: true };

      const basePayload = snapshot
        ? { client_id: clientId, ...snapshotToCreditAnalysis(snapshot), status: ANALYSIS_STATUS.draft }
        : { client_id: clientId, status: ANALYSIS_STATUS.draft };

      const fullPayload: Record<string, unknown> = { ...basePayload, prospect_id: prospect.id };

      let inserted = await supabase
        .from("credit_analysis")
        .insert(fullPayload as { client_id: string } & Record<string, unknown>)
        .select("id").single();
      if (inserted.error) {
        // Coluna prospect_id ainda não existe — retry sem ela
        delete fullPayload.prospect_id;
        inserted = await supabase
          .from("credit_analysis")
          .insert(fullPayload as { client_id: string } & Record<string, unknown>)
          .select("id").single();
      }
      if (inserted.error) throw inserted.error;
      const analysis = inserted.data;
      if (snapshot && analysis) await insertSnapshotSocios(analysis.id, snapshot);
      return { analysisId: analysis.id, reused: false };
    },
    onSuccess: ({ analysisId, reused }) => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["all-analyses-for-kanban"] });
      toast.success(reused ? "Análise existente aberta" : "Análise iniciada");
      navigate(`/analises/${analysisId}`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao iniciar análise"),
    onSettled: () => setBusyAction(null),
  });

  // 3. Descartar — remove prospect e (opcionalmente) cascateia pro cliente vinculado
  const discard = useMutation({
    mutationFn: async ({ prospect, cascade }: { prospect: Prospect; cascade: boolean }) => {
      setBusyAction({ id: prospect.id, action: "discard" });

      if (cascade && prospect.client_id) {
        const clientId = prospect.client_id;

        // FKs do credit_analysis → clients são RESTRICT (migration 20260428221846).
        // Precisamos apagar manualmente as filhas na ordem certa:
        //   1. Filhas profundas das análises
        //   2. Análises
        //   3. Deals (também tem FK pra clients)
        //   4. Cliente
        //   5. Prospect

        // Pega ids das análises do cliente
        const { data: analyses } = await supabase
          .from("credit_analysis").select("id").eq("client_id", clientId);
        const analysisIds = (analyses || []).map(a => a.id);

        if (analysisIds.length > 0) {
          // Filhas das análises
          await Promise.all([
            supabase.from("credit_analysis_attachments").delete().in("credit_analysis_id", analysisIds),
            supabase.from("credit_analysis_insights").delete().in("credit_analysis_id", analysisIds),
            supabase.from("credit_analysis_socios").delete().in("credit_analysis_id", analysisIds),
            supabase.from("credit_analysis_sacados").delete().in("credit_analysis_id", analysisIds),
            supabase.from("credit_committee").delete().in("credit_analysis_id", analysisIds),
            supabase.from("committee_result").delete().in("credit_analysis_id", analysisIds),
          ]);

          // Análises
          const { error: analErr } = await supabase
            .from("credit_analysis").delete().in("id", analysisIds);
          if (analErr) throw analErr;
        }

        // Deals do cliente
        const { error: dealsErr } = await supabase
          .from("deals").delete().eq("client_id", clientId);
        if (dealsErr) throw dealsErr;

        // Outras tabelas com FK pra clients (best-effort, ignora erros não-críticos)
        await Promise.all([
          supabase.from("contacts").delete().eq("client_id", clientId),
          supabase.from("monitoring_group_clients").delete().eq("client_id", clientId),
          supabase.from("activities").delete().eq("client_id", clientId),
          supabase.from("crm_tasks").delete().eq("client_id", clientId),
        ]);

        // Cliente
        const { error: clientErr } = await supabase
          .from("clients").delete().eq("id", clientId);
        if (clientErr) throw clientErr;
      }

      // Prospect (tem client_id ON DELETE SET NULL, mas como já apagamos o client antes, está null aqui)
      const { error } = await supabase.from("prospects").delete().eq("id", prospect.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      // Invalida tudo que pode ter referência ao client deletado:
      // prospects, clients (Portfólio), deals (Pipeline), análises (kanban + Portfólio)
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients-list-min"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["credit-analyses"] });
      qc.invalidateQueries({ queryKey: ["all-analyses-for-kanban"] });
      qc.invalidateQueries({ queryKey: ["credit-analyses-for-pipeline"] });
      toast.success(vars.cascade ? "Prospect e cedente vinculado removidos" : "Prospect descartado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao descartar"),
    onSettled: () => setBusyAction(null),
  });

  // Confirmação de descarte com cascade
  const [confirmDiscard, setConfirmDiscard] = useState<{
    prospect: Prospect;
    relatedAnalyses: number;
    relatedDeals: number;
  } | null>(null);

  async function requestDiscard(prospect: Prospect) {
    if (!prospect.client_id) {
      // Prospect ainda não promovido — só remove ele
      discard.mutate({ prospect, cascade: false });
      return;
    }

    // Promovido: pergunta se quer remover tudo vinculado
    const [analysesRes, dealsRes] = await Promise.all([
      supabase.from("credit_analysis").select("id", { count: "exact", head: true }).eq("client_id", prospect.client_id),
      supabase.from("deals").select("id", { count: "exact", head: true }).eq("client_id", prospect.client_id),
    ]);
    setConfirmDiscard({
      prospect,
      relatedAnalyses: analysesRes.count ?? 0,
      relatedDeals: dealsRes.count ?? 0,
    });
  }

  // ── Filters ────────────────────────────────────────────────────────
  const promotedCount = prospects.filter(p => !!p.client_id).length;
  const filtered = prospects.filter(p => {
    if (hidePromoted && p.client_id) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.documento.includes(q) || (p.nome || "").toLowerCase().includes(q);
  });

  const stats = {
    total: prospects.length,
    qualified: prospects.filter(p => p.qualification_status === "qualified").length,
    notQualified: prospects.filter(p => p.qualification_status === "not_qualified").length,
    pending: prospects.filter(p => p.qualification_status === "pending").length,
    expired: prospects.filter(p => p.expires_at && new Date(p.expires_at) < new Date()).length,
  };

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title="Prospects"
        subtitle={`INBOX DE LEADS PRÉ-QUALIFICADOS${validityDays ? ` · VALIDADE ${validityDays} DIAS` : ""}`}
        actions={
          <button
            onClick={() => navigate("/consulta")}
            className="flex items-center gap-2 px-[16px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: T.marinho }}
          >
            <UserSearch style={{ width: 14, height: 14 }} />
            Nova consulta
          </button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi label="Total"             value={stats.total}        color={T.text} />
        <Kpi label="Qualificados"      value={stats.qualified}    color={T.esmeralda} />
        <Kpi label="Não qualificados"  value={stats.notQualified} color={T.danger} />
        <Kpi label="Pendentes"         value={stats.pending}      color={T.amber} />
        <Kpi label="Expirados"         value={stats.expired}      color={T.textMute} />
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: T.textFaint }} />
          <input
            placeholder="Buscar por documento ou nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-[9px] rounded-[10px] text-[14px] outline-none transition-all"
            style={{
              background: T.white,
              border: `1px solid ${T.border}`,
              color: T.text,
              boxShadow: "0 1px 2px rgba(10,21,56,0.04)",
            }}
            onFocus={(e) => (e.target.style.borderColor = T.esmeralda)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
        </div>

        {promotedCount > 0 && (
          <label
            className="inline-flex items-center gap-2 cursor-pointer select-none"
            style={{ fontSize: 12.5, color: T.textMute }}
          >
            <input
              type="checkbox"
              checked={hidePromoted}
              onChange={(e) => togglePromotedFilter(e.target.checked)}
              className="rounded border-border"
            />
            <span>
              Esconder promovidos
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textFaint, marginLeft: 6 }}>
                ({promotedCount})
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" style={{ color: T.textMute }}>
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState onConsult={() => navigate("/consulta")} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((p, i) => (
            <ProspectCard
              key={p.id}
              prospect={p}
              index={i}
              busyMove={busyAction?.id === p.id && busyAction?.action === "pipeline"}
              busyAnalysis={busyAction?.id === p.id && busyAction?.action === "analise"}
              busyDiscard={busyAction?.id === p.id && busyAction?.action === "discard"}
              onMoveToPipeline={() => moveToPipeline.mutate(p)}
              onStartAnalysis={() => startAnalysis.mutate(p)}
              onDiscard={() => requestDiscard(p)}
              onReconsult={() => navigate(`/consulta?doc=${p.documento}`)}
              onSeeClient={p.client_id ? () => navigate(`/cedentes/${p.client_id}/perfil`) : undefined}
              onOpenDetail={() => navigate(`/prospects/${p.id}`)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={!!confirmDiscard} onOpenChange={(o) => !o && setConfirmDiscard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar prospect?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-[13px]">
                <p>
                  Este prospect já foi promovido para cedente. O que você quer fazer?
                </p>
                {confirmDiscard && (confirmDiscard.relatedAnalyses > 0 || confirmDiscard.relatedDeals > 0) && (
                  <div
                    className="rounded-[8px] px-3 py-2 mt-2"
                    style={{ background: "rgba(176,24,42,0.06)", border: "1px solid rgba(176,24,42,0.20)" }}
                  >
                    <p style={{ color: T.danger, fontSize: 12 }}>
                      Apagar tudo vai remover também:
                    </p>
                    <ul className="ml-4 mt-1" style={{ fontSize: 12, listStyle: "disc", color: T.text }}>
                      <li>O cedente vinculado</li>
                      {confirmDiscard.relatedAnalyses > 0 && (
                        <li>{confirmDiscard.relatedAnalyses} análise{confirmDiscard.relatedAnalyses > 1 ? "s" : ""} de crédito</li>
                      )}
                      {confirmDiscard.relatedDeals > 0 && (
                        <li>{confirmDiscard.relatedDeals} deal{confirmDiscard.relatedDeals > 1 ? "s" : ""} no Pipeline</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <button
              onClick={() => {
                if (confirmDiscard) discard.mutate({ prospect: confirmDiscard.prospect, cascade: false });
                setConfirmDiscard(null);
              }}
              className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors"
              style={{ border: `1px solid ${T.borderStrong}`, background: T.white, color: T.text }}
            >
              Só o prospect
            </button>
            <AlertDialogAction
              onClick={() => {
                if (confirmDiscard) discard.mutate({ prospect: confirmDiscard.prospect, cascade: true });
                setConfirmDiscard(null);
              }}
              style={{ background: T.danger, color: "#FAFAF7" }}
            >
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Components ───────────────────────────────────────────────────────

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-[14px] px-4 py-3"
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>{label}</p>
      <p className="font-bold tabular-nums mt-1" style={{ fontSize: 24, color, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

function EmptyState({ onConsult }: { onConsult: () => void }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-[14px]"
      style={{ background: T.white, border: `1px dashed ${T.borderMed}` }}
    >
      <UserSearch className="h-10 w-10 mb-3" style={{ color: T.textFaint }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Nenhum prospect encontrado</p>
      <p className="mt-1" style={{ fontSize: 12, color: T.textMute }}>
        Faça uma consulta de CNPJ para gerar leads pré-qualificados.
      </p>
      <button
        onClick={onConsult}
        className="mt-4 px-5 py-[8px] rounded-[999px] text-[13px] font-medium text-white"
        style={{ background: T.marinho }}
      >
        Nova consulta
      </button>
    </div>
  );
}

function ProspectCard({
  prospect: p,
  index,
  busyMove,
  busyAnalysis,
  busyDiscard,
  onMoveToPipeline,
  onStartAnalysis,
  onDiscard,
  onReconsult,
  onSeeClient,
  onOpenDetail,
}: {
  prospect: Prospect;
  index: number;
  busyMove: boolean;
  busyAnalysis: boolean;
  busyDiscard: boolean;
  onMoveToPipeline: () => void;
  onStartAnalysis: () => void;
  onDiscard: () => void;
  onReconsult: () => void;
  onSeeClient?: () => void;
  onOpenDetail?: () => void;
}) {
  const anyBusy = busyMove || busyAnalysis || busyDiscard;
  const status = STATUS_CFG[p.qualification_status] || STATUS_CFG.pending;
  const risk = RISK_CFG[p.risk_level || "unknown"] || RISK_CFG.unknown;
  const expired = !!(p.expires_at && new Date(p.expires_at) < new Date());

  // Extrai dados do snapshot — estrutura é flat (não aninhada em cadastral/restritivos)
  const snapshot = (p.qualification_data?.snapshot ?? null) as ConsultaSnapshot | null;

  const cidade = snapshot?.cidade;
  const uf = snapshot?.estado;
  const segmento = snapshot?.segmento;
  const fantasia = snapshot?.nome_fantasia;
  const capitalSocial = snapshot?.capital_social;

  const hasProtestos = (snapshot?.protestos_qtd ?? 0) > 0
    || (!!snapshot?.protestos_texto && snapshot.protestos_texto !== "Nada consta");
  const hasPendencias = (snapshot?.pendencias_qtd ?? 0) > 0
    || (!!snapshot?.pendencias_texto && snapshot.pendencias_texto !== "Nada consta");
  const hasAcoes = (snapshot?.acoes_judiciais_qtd ?? 0) > 0
    || (!!snapshot?.acoes_judiciais_texto && snapshot.acoes_judiciais_texto !== "Nada consta");
  const restritivosCount = [hasProtestos, hasPendencias, hasAcoes].filter(Boolean).length;

  const promotedAlready = !!p.client_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.3) }}
      className="rounded-[14px] flex flex-col"
      style={{
        background: T.white,
        border: `1px solid ${expired ? T.borderMed : T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
        opacity: expired ? 0.78 : 1,
      }}
    >
      {/* Header — clica no nome pra abrir detalhe */}
      <div
        className={`px-5 pt-4 pb-3 flex items-start gap-3 ${onOpenDetail ? "cursor-pointer hover:bg-[rgba(10,21,56,0.02)]" : ""} transition-colors`}
        style={{ borderBottom: `1px solid ${T.border}` }}
        onClick={onOpenDetail}
      >
        <div
          className="rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ width: 38, height: 38, background: `${status.color}15`, color: status.color }}
        >
          <Building2 style={{ width: 18, height: 18 }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate" style={{ fontSize: 15, fontWeight: 600, color: T.text, lineHeight: 1.2 }}>
            {p.nome || snapshot?.razao_social || "—"}
          </p>
          {fantasia && (
            <p className="truncate" style={{ fontSize: 12, color: T.textMute, marginTop: 1 }}>
              {fantasia}
            </p>
          )}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute, marginTop: 3, letterSpacing: "0.02em" }}>
            {formatCNPJorCPF(p.documento)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <Pill color={status.color}>{status.label}</Pill>
          {expired && <Pill color={T.danger}>Expirado</Pill>}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex-1 space-y-3">
        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontSize: 12, color: T.textMute }}>
          {cidade && uf && (
            <span className="inline-flex items-center gap-1">
              <MapPin style={{ width: 11, height: 11 }} /> {cidade}/{uf}
            </span>
          )}
          {segmento && (
            <span className="inline-flex items-center gap-1 truncate max-w-[260px]" title={segmento}>
              <Briefcase style={{ width: 11, height: 11 }} /> {segmento}
            </span>
          )}
          {capitalSocial != null && capitalSocial > 0 && (
            <span className="inline-flex items-center gap-1">
              <Shield style={{ width: 11, height: 11 }} /> Cap. R$ {(capitalSocial / 1000).toFixed(0)}k
            </span>
          )}
        </div>

        {/* Score + Risk + Restritivos */}
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Score" value={p.qualification_score != null ? String(p.qualification_score) : "—"} color={p.qualification_score != null ? (p.qualification_score >= 60 ? T.esmeralda : p.qualification_score >= 30 ? T.amber : T.danger) : T.textMute} />
          <Metric label="Risco" value={risk.label.replace("Risco ", "")} color={risk.color} />
          <Metric
            label="Restritivos"
            value={restritivosCount > 0 ? `${restritivosCount} apontamento${restritivosCount > 1 ? "s" : ""}` : "Limpo"}
            color={restritivosCount > 0 ? T.danger : T.esmeralda}
          />
        </div>

        {/* Dates */}
        <div className="flex items-center gap-3" style={{ fontSize: 11, color: T.textFaint, fontFamily: "var(--font-mono)" }}>
          <span>Consultado: {formatDate(p.created_at)}</span>
          {p.expires_at && <span>Expira: {formatDate(p.expires_at)}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: `1px solid ${T.border}`, background: T.paper }}>
        {promotedAlready ? (
          <>
            <button
              onClick={onSeeClient}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12.5px] font-medium transition-opacity hover:opacity-90"
              style={{ background: T.marinho, color: "#FAFAF7" }}
            >
              <Building2 style={{ width: 13, height: 13 }} />
              Ver cedente
            </button>
            <ActionIconButton onClick={onReconsult} title="Reconsultar">
              <RefreshCw style={{ width: 13, height: 13 }} />
            </ActionIconButton>
            <ActionIconButton onClick={onDiscard} title="Descartar" danger>
              <Trash2 style={{ width: 13, height: 13 }} />
            </ActionIconButton>
          </>
        ) : (
          <>
            <button
              onClick={onMoveToPipeline}
              disabled={anyBusy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12.5px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: T.marinho, color: "#FAFAF7" }}
              title="Move o prospect para o Pipeline comercial — comercial vai começar a abordagem"
            >
              {busyMove ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Briefcase style={{ width: 13, height: 13 }} />}
              Mover p/ Pipeline
            </button>
            <button
              onClick={onStartAnalysis}
              disabled={anyBusy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12.5px] font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: "rgba(0,212,154,0.10)",
                color: T.text,
                border: `1px solid ${T.esmeralda}`,
              }}
              title="Pula o pipeline e cria análise direto — útil quando cliente já topou ou é indicação direta"
            >
              {busyAnalysis ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <FileSearch style={{ width: 13, height: 13 }} />}
              Iniciar análise
            </button>
            <ActionIconButton onClick={onReconsult} title="Reconsultar">
              <RefreshCw style={{ width: 13, height: 13 }} />
            </ActionIconButton>
            <ActionIconButton onClick={onDiscard} title="Descartar" danger>
              {busyDiscard ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : <Trash2 style={{ width: 13, height: 13 }} />}
            </ActionIconButton>
          </>
        )}
      </div>
    </motion.div>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.03em",
        padding: "3px 8px",
        borderRadius: 999,
        background: `${color}15`,
        color,
        border: `1px solid ${color}30`,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[8px] px-3 py-2" style={{ background: T.paper, border: `1px solid ${T.border}` }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textFaint }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 600, color, marginTop: 1 }}>{value}</p>
    </div>
  );
}

function ActionIconButton({
  onClick, title, children, danger,
}: { onClick?: () => void; title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-[8px] transition-colors"
      style={{
        background: "transparent",
        color: danger ? T.danger : T.textMute,
        border: `1px solid ${T.border}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? "rgba(176,24,42,0.06)" : T.cinza; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
