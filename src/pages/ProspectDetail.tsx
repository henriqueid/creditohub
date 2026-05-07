import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { formatCNPJorCPF, formatDate } from "@/lib/formatters";
import {
  ArrowLeft, Building2, Loader2, AlertTriangle, CheckCircle2,
  XCircle, Clock, Search, Sparkles, ChevronRight, ChevronDown,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  qualified:     { label: "Qualificado",      color: T.esmeralda, icon: CheckCircle2 },
  pending:       { label: "Pendente",          color: T.amber,     icon: Clock },
  not_qualified: { label: "Não qualificado",   color: T.danger,    icon: XCircle },
};

const RISK_META: Record<string, { label: string; color: string }> = {
  low:     { label: "Risco baixo",   color: T.esmeralda },
  medium:  { label: "Risco médio",   color: T.amber },
  high:    { label: "Risco alto",    color: T.danger },
  unknown: { label: "Risco a apurar", color: T.textMute },
};

export default function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  const { data: prospect, isLoading } = useQuery({
    queryKey: ["prospect", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
      </div>
    );
  }

  if (!prospect) {
    return (
      <div className="p-7">
        <p style={{ color: T.textMute }}>Prospect não encontrado.</p>
        <button onClick={() => navigate("/prospects")} className="mt-3 text-[13px] underline" style={{ color: T.esmeralda }}>
          Voltar para a lista
        </button>
      </div>
    );
  }

  const data = (prospect.qualification_data ?? {}) as Record<string, any>;
  const snapshot = (data.snapshot ?? {}) as Record<string, any>;
  const reasons: string[] = Array.isArray(data.reasons) ? data.reasons : [];
  const positives: string[] = Array.isArray(data.positives) ? data.positives : [];
  const suggestedAction = data.suggestedAction as string | undefined;

  const status = STATUS_META[prospect.qualification_status as string] ?? { label: prospect.qualification_status, color: T.textMute, icon: AlertTriangle };
  const risk = RISK_META[prospect.risk_level as string] ?? RISK_META.unknown;
  const StatusIcon = status.icon;

  const expired = prospect.expires_at && new Date(prospect.expires_at) < new Date();

  const handleConvertToClient = () => {
    const prefill = {
      cnpj_cpf: prospect.documento,
      razao_social: snapshot.razao_social || prospect.nome || "",
      nome_fantasia: snapshot.nome_fantasia || "",
      data_fundacao: snapshot.data_inicio_atividade || "",
      segmento: snapshot.cnae_descricao || "",
      cidade: snapshot.endereco?.cidade || "",
      estado: snapshot.endereco?.uf || "",
    };
    navigate("/cedentes/novo", { state: { prefill, snapshot } });
  };

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <button
        onClick={() => navigate("/prospects")}
        className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline mb-2"
        style={{ color: T.textMute }}
      >
        <ArrowLeft style={{ width: 12, height: 12 }} /> Todos os prospects
      </button>

      <PageHeader
        title={prospect.nome || snapshot.razao_social || "Prospect"}
        subtitle={`${formatCNPJorCPF(prospect.documento)} · Criado em ${formatDate(prospect.created_at)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {prospect.client_id ? (
              <button
                onClick={() => navigate(`/cedentes/${prospect.client_id}/perfil`)}
                className="px-[14px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: T.marinho }}
              >
                Abrir cedente <ChevronRight className="h-3.5 w-3.5 ml-1 inline" />
              </button>
            ) : (
              <button
                onClick={handleConvertToClient}
                className="px-[14px] py-[9px] rounded-[999px] text-[13px] font-medium transition-opacity hover:opacity-90"
                style={{ background: T.esmeralda, color: T.marinho }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 inline" /> Converter em cedente
              </button>
            )}
            <button
              onClick={() => navigate(`/consulta?doc=${prospect.documento}`)}
              className="px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
              style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
            >
              <Search className="h-3.5 w-3.5 mr-1.5 inline" /> Reconsultar
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiBlock label="Status">
          <div className="flex items-center gap-2">
            <StatusIcon style={{ width: 16, height: 16, color: status.color }} />
            <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
          </div>
        </KpiBlock>
        <KpiBlock label="Score" value={prospect.qualification_score != null ? String(prospect.qualification_score) : "—"} color={prospect.qualification_score != null && prospect.qualification_score >= 60 ? T.esmeralda : prospect.qualification_score != null && prospect.qualification_score >= 30 ? T.amber : T.textMute} />
        <KpiBlock label="Risco" value={risk.label} color={risk.color} />
        <KpiBlock
          label="Expiração"
          value={prospect.expires_at ? formatDate(prospect.expires_at) : "—"}
          color={expired ? T.danger : T.text}
          sub={expired ? "Expirado" : undefined}
        />
      </div>

      {/* Sugestão */}
      {suggestedAction && (
        <div
          className="rounded-[12px] px-4 py-3 flex items-start gap-3"
          style={{ background: `${status.color}10`, border: `1px solid ${status.color}30` }}
        >
          <Sparkles style={{ width: 16, height: 16, color: status.color, marginTop: 2, flexShrink: 0 }} />
          <div className="min-w-0 flex-1">
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: status.color, fontWeight: 700 }}>
              Ação sugerida
            </p>
            <p style={{ fontSize: 13, color: T.text, marginTop: 2 }}>{suggestedAction}</p>
          </div>
        </div>
      )}

      {/* Razões e positivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
        <Section title="Pontos positivos" icon={CheckCircle2} accent={T.esmeralda}>
          {positives.length === 0 ? (
            <Empty text="Nenhum ponto positivo identificado" />
          ) : (
            <ul className="space-y-1.5">
              {positives.map((p, i) => (
                <li key={i} className="flex items-start gap-2 py-1" style={{ fontSize: 13 }}>
                  <CheckCircle2 style={{ width: 12, height: 12, color: T.esmeralda, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ color: T.text }}>{p}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Razões / restrições" icon={AlertTriangle} accent={T.danger}>
          {reasons.length === 0 ? (
            <Empty text="Nenhuma restrição identificada" />
          ) : (
            <ul className="space-y-1.5">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 py-1" style={{ fontSize: 13 }}>
                  <AlertTriangle style={{ width: 12, height: 12, color: T.danger, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ color: T.text }}>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {/* Dados da consulta (snapshot) */}
      <Section title="Dados da consulta" icon={Building2}>
        {Object.keys(snapshot).length === 0 ? (
          <Empty text="Sem snapshot da consulta — dispare uma reconsulta." />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3">
              <Row label="Razão social" value={snapshot.razao_social} />
              <Row label="Nome fantasia" value={snapshot.nome_fantasia} />
              <Row label="CNAE" value={snapshot.cnae_descricao} />
              <Row label="Data de fundação" value={snapshot.data_inicio_atividade ? formatDate(snapshot.data_inicio_atividade) : null} />
              <Row label="Capital social" value={snapshot.capital_social ? `R$ ${Number(snapshot.capital_social).toLocaleString("pt-BR")}` : null} />
              <Row label="Situação" value={snapshot.situacao_cadastral} />
              <Row label="Município" value={snapshot.endereco?.cidade && snapshot.endereco?.uf ? `${snapshot.endereco.cidade}/${snapshot.endereco.uf}` : null} />
              <Row label="Score bureau" value={snapshot.credit_score?.toString()} />
            </div>

            <button
              onClick={() => setSnapshotOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium hover:underline mt-2"
              style={{ color: T.textMute }}
            >
              {snapshotOpen ? <ChevronDown style={{ width: 12, height: 12 }} /> : <ChevronRight style={{ width: 12, height: 12 }} />}
              {snapshotOpen ? "Ocultar JSON completo" : "Ver JSON completo"}
            </button>
            {snapshotOpen && (
              <pre
                className="mt-2 p-3 rounded-[8px] overflow-x-auto"
                style={{
                  background: "rgba(10,21,56,0.04)",
                  border: `1px solid ${T.border}`,
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  maxHeight: 400,
                }}
              >
                {JSON.stringify(snapshot, null, 2)}
              </pre>
            )}
          </>
        )}
      </Section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function KpiBlock({ label, value, children, color, sub }: { label: string; value?: string; children?: React.ReactNode; color?: string; sub?: string }) {
  return (
    <div
      className="rounded-[14px] px-4 py-3"
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>
        {label}
      </p>
      <div style={{ fontSize: 16, fontWeight: 700, color: color ?? T.text, fontFamily: "var(--font-mono)", lineHeight: 1.2, marginTop: 4 }}>
        {children ?? value}
      </div>
      {sub && (
        <p style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{sub}</p>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, accent, children }: { title: string; icon: React.ElementType; accent?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
      }}
    >
      <div
        className="flex items-center px-4 py-3 gap-2"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}
      >
        <Icon className="h-4 w-4" style={{ color: accent ?? T.esmeralda }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{title}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-baseline gap-3 py-1" style={{ borderBottom: `1px dotted ${T.border}` }}>
      <span style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 13, color: value ? T.text : T.textFaint, fontWeight: 500, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-3 text-center" style={{ fontSize: 12, color: T.textFaint }}>{text}</p>;
}
