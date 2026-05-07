import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, History, LayoutGrid, List, FileText, Building2, GripVertical, Pencil, CheckCircle2, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate, formatBRL } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { T } from "@/lib/tokens";
import { PageHeader } from "@/components/trilho/PageHeader";
import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { ClientTagManager, TagFilter, useAllClientTags } from "@/components/crm/ClientTagManager";

type ClientTab = "todos" | "em-analise" | "aprovados" | "restricoes" | "reprovados";

type KanbanStage = "draft" | "in_committee" | "approved" | "approved_restricted" | "rejected";

const stages: { key: KanbanStage; label: string; color: string; borderColor: string; headerBg: string }[] = [
  { key: "draft", label: "Em Análise", color: "bg-status-draft/10 text-status-draft", borderColor: "border-status-draft/40", headerBg: "bg-status-draft/5" },
  { key: "in_committee", label: "Em Comitê", color: "bg-status-committee/10 text-status-committee", borderColor: "border-status-committee/40", headerBg: "bg-status-committee/5" },
  { key: "approved", label: "Aprovado", color: "bg-status-approved/10 text-status-approved", borderColor: "border-status-approved/40", headerBg: "bg-status-approved/5" },
  { key: "approved_restricted", label: "Aprovado c/ Restrição", color: "bg-status-restricted/10 text-status-restricted", borderColor: "border-status-restricted/40", headerBg: "bg-status-restricted/5" },
  { key: "rejected", label: "Reprovado", color: "bg-status-rejected/10 text-status-rejected", borderColor: "border-status-rejected/40", headerBg: "bg-status-rejected/5" },
];

// Which transitions are allowed via drag
const allowedTransitions: Record<KanbanStage, KanbanStage[]> = {
  draft: ["in_committee"],
  in_committee: [], // decided via committee voting only
  approved: [],
  approved_restricted: [],
  rejected: ["draft"], // allow re-analysis
};

interface ClientWithAnalysis {
  id: string;
  razao_social: string;
  cnpj_cpf: string;
  nome_fantasia: string | null;
  segmento: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
  latestStatus: KanbanStage | "cadastrado";
  latestAnalysisId: string | null;
  latestLimiteSugerido: number | null;
  latestScore: number | null;
}

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ClientTab>("todos");
  const { data: clientTagsMap = {} } = useAllClientTags();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: analyses = [] } = useQuery({
    queryKey: ["all-analyses-for-kanban"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("id, client_id, status, limite_sugerido, credit_score, created_at, updated_at, analista_credito, committee_result(limite_aprovado, prazo_aprovado, decisao_final, condicoes_adicionais)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const enrichedClients = useMemo<ClientWithAnalysis[]>(() => {
    // Portfólio = só cedentes que já entraram no fluxo de análise.
    // Cedentes sem análise (status virtual "cadastrado") aparecem em Prospects, não aqui.
    return clients
      .map((c) => {
        const latest = analyses.filter((a) => a.client_id === c.id)[0];
        return {
          ...c,
          latestStatus: latest ? (latest.status as KanbanStage) : ("cadastrado" as const),
          latestAnalysisId: latest?.id ?? null,
          latestLimiteSugerido: latest?.limite_sugerido ?? null,
          latestScore: latest?.credit_score ?? null,
        };
      })
      .filter((c) => c.latestStatus !== "cadastrado");
  }, [clients, analyses]);

  const filtered = useMemo(() => {
    let result = enrichedClients;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.razao_social.toLowerCase().includes(q) ||
          c.cnpj_cpf.includes(q) ||
          (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(q))
      );
    }
    if (selectedTags.length > 0) {
      result = result.filter((c) => {
        const tags = clientTagsMap[c.id] || [];
        return selectedTags.some((st) => tags.some((t) => t.id === st));
      });
    }
    return result;
  }, [enrichedClients, search, selectedTags, clientTagsMap]);

  const grouped = useMemo(() => {
    const map: Record<KanbanStage, ClientWithAnalysis[]> = {
      cadastrado: [], draft: [], in_committee: [], approved: [], approved_restricted: [], rejected: [],
    };
    filtered.forEach((c) => map[c.latestStatus]?.push(c));
    return map;
  }, [filtered]);

  // --- Mutations for stage transitions ---
  const createAnalysisMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .insert({ client_id: clientId, status: "draft" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses-for-kanban"] });
      toast.success("Análise criada! Redirecionando...");
      navigate(`/analises/${data.id}`);
    },
    onError: () => toast.error("Erro ao criar análise"),
  });

  const sendToCommitteeMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      const { error } = await supabase
        .from("credit_analysis")
        .update({ status: "in_committee" })
        .eq("id", analysisId);
      if (error) throw error;
      return analysisId;
    },
    onSuccess: (analysisId) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses-for-kanban"] });
      toast.success("Enviado ao comitê! Redirecionando...");
      navigate(`/comite/${analysisId}`);
    },
    onError: () => toast.error("Erro ao enviar ao comitê"),
  });

  const reanalyzeMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .insert({ client_id: clientId, status: "draft" })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["all-analyses-for-kanban"] });
      toast.success("Nova análise criada! Redirecionando...");
      navigate(`/analises/${data.id}`);
    },
    onError: () => toast.error("Erro ao criar nova análise"),
  });

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { draggableId, source, destination } = result;
      if (!destination || source.droppableId === destination.droppableId) return;

      const fromStage = source.droppableId as KanbanStage;
      const toStage = destination.droppableId as KanbanStage;
      const client = enrichedClients.find((c) => c.id === draggableId);
      if (!client) return;

      const allowed = allowedTransitions[fromStage];
      if (!allowed.includes(toStage)) {
        const stageLabel = stages.find((s) => s.key === toStage)?.label ?? toStage;
        if (fromStage === "in_committee") {
          toast.error("A decisão do comitê deve ser feita pela tela de votação");
        } else {
          toast.error(`Transição para "${stageLabel}" não permitida a partir desta etapa`);
        }
        return;
      }

      // Execute transition
      if (fromStage === "cadastrado" && toStage === "draft") {
        createAnalysisMutation.mutate(client.id);
      } else if (fromStage === "draft" && toStage === "in_committee") {
        if (!client.latestAnalysisId) {
          toast.error("Análise não encontrada");
          return;
        }
        sendToCommitteeMutation.mutate(client.latestAnalysisId);
      } else if (fromStage === "rejected" && toStage === "draft") {
        reanalyzeMutation.mutate(client.id);
      }
    },
    [enrichedClients, createAnalysisMutation, sendToCommitteeMutation, reanalyzeMutation]
  );

  const handleCardClick = (client: ClientWithAnalysis) => {
    // Atalhos contextuais — leva direto pra ação esperada do estágio.
    // Pra ver perfil completo, usa o botão Building2 na coluna de ações.
    if (client.latestStatus === "in_committee" && client.latestAnalysisId) {
      navigate(`/comite/${client.latestAnalysisId}`);
    } else if (client.latestAnalysisId) {
      navigate(`/analises/${client.latestAnalysisId}`);
    } else {
      navigate(`/cedentes/${client.id}/perfil`);
    }
  };

  const getCardDestinationLabel = (stage: KanbanStage) => {
    const allowed = allowedTransitions[stage];
    if (allowed.length === 0) return null;
    const next = stages.find((s) => s.key === allowed[0]);
    return next?.label ?? null;
  };

  const isMutating =
    createAnalysisMutation.isPending ||
    sendToCommitteeMutation.isPending ||
    reanalyzeMutation.isPending;

  const kpiTotals = useMemo(() => ({
    total: enrichedClients.length,
    aprovados: enrichedClients.filter(c => c.latestStatus === "approved").length,
    emAnalise: enrichedClients.filter(c => ["draft", "in_committee"].includes(c.latestStatus)).length,
    reprovados: enrichedClients.filter(c => c.latestStatus === "rejected").length,
    restricoes: enrichedClients.filter(c => c.latestStatus === "approved_restricted").length,
  }), [enrichedClients]);

  const TAB_DEF: { key: ClientTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "todos",       label: "Todos",         icon: Building2,     count: kpiTotals.total },
    { key: "em-analise",  label: "Em Análise",    icon: AlertCircle,   count: kpiTotals.emAnalise },
    { key: "aprovados",   label: "Aprovados",     icon: CheckCircle2,  count: kpiTotals.aprovados },
    { key: "restricoes",  label: "Restrições",    icon: AlertCircle,   count: kpiTotals.restricoes },
    { key: "reprovados",  label: "Reprovados",    icon: XCircle,       count: kpiTotals.reprovados },
  ];

  // Clients filtered by tab for non-kanban tabs
  const tabClients = useMemo(() => {
    const base = search
      ? enrichedClients.filter(c =>
          c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
          c.cnpj_cpf.includes(search)
        )
      : enrichedClients;
    if (activeTab === "aprovados") return base.filter(c => c.latestStatus === "approved");
    if (activeTab === "restricoes") return base.filter(c => c.latestStatus === "approved_restricted");
    if (activeTab === "reprovados") return base.filter(c => c.latestStatus === "rejected");
    if (activeTab === "em-analise") return base.filter(c => ["draft", "in_committee"].includes(c.latestStatus));
    return base;
  }, [enrichedClients, search, activeTab]);

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <PageHeader
        title="Portfólio"
        subtitle={`${kpiTotals.total} CEDENTES · EM ANÁLISE, COMITÊ OU DECIDIDOS`}
        actions={
          <button
            onClick={() => navigate("/cedentes/novo")}
            className="flex items-center gap-2 px-[16px] py-[9px] rounded-[999px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: T.marinho }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Novo cedente
          </button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de cedentes", value: kpiTotals.total, color: T.text },
          { label: "Aprovados", value: kpiTotals.aprovados, color: T.esmeralda },
          { label: "Em análise", value: kpiTotals.emAnalise, color: T.amber },
          { label: "Reprovados", value: kpiTotals.reprovados, color: T.danger },
        ].map(k => (
          <div
            key={k.label}
            className="rounded-[14px] px-4 py-3"
            style={{
              background: T.white,
              border: `1px solid ${T.border}`,
              boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)",
            }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>{k.label}</p>
            <p className="font-bold tabular-nums mt-1" style={{ fontSize: 24, color: k.color, lineHeight: 1.1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TAB_DEF.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            <span className={`ml-1 text-[11px] font-bold px-1.5 rounded-full ${activeTab === key ? "bg-primary/10" : "bg-muted"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {(activeTab === "todos" || activeTab === "em-analise") && (
          <>
            <TagFilter selectedTags={selectedTags} onChange={setSelectedTags} />
            <div className="flex items-center rounded-lg border bg-card p-0.5 ml-auto">
              <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-8 px-3" onClick={() => setView("kanban")}>
                <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
              </Button>
              <Button variant={view === "table" ? "default" : "ghost"} size="sm" className="h-8 px-3" onClick={() => setView("table")}>
                <List className="h-4 w-4 mr-1" /> Tabela
              </Button>
            </div>
          </>
        )}
      </div>

      {/* ── Tab: Aprovados ── */}
      {activeTab === "aprovados" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {tabClients.length === 0 ? (
            <EmptyTabState
              icon={CheckCircle2}
              title="Nenhum cedente aprovado"
              hint="Cedentes que tiverem decisão final 'aprovado' no comitê aparecem aqui."
            />
          ) : tabClients.map(c => {
            const result = (analyses.find(a => a.client_id === c.id && a.status === "approved") as any)?.committee_result;
            const tier = c.latestScore ? (c.latestScore >= 800 ? "AAA" : c.latestScore >= 700 ? "AA" : c.latestScore >= 600 ? "A" : "BBB") : null;
            return (
              <div
                key={c.id}
                className="rounded-[14px] cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(10,21,56,0.08),0_8px_22px_-6px_rgba(10,21,56,0.10)]"
                style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}
                onClick={() => navigate(`/cedentes/${c.id}/perfil`)}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13.5px] truncate" style={{ color: T.text }}>{c.razao_social}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute, marginTop: 2 }}>{formatCNPJorCPF(c.cnpj_cpf)}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-status-approved shrink-0" />
                </div>
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>Score</p>
                    <p className="font-bold text-[14px] tabular-nums mt-0.5" style={{ color: T.text }}>{c.latestScore ?? "—"} {tier && <span className="text-[11px] font-medium" style={{ color: T.textMute }}>{tier}</span>}</p>
                  </div>
                  <div>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>Limite aprovado</p>
                    <p className="font-bold text-[14px] tabular-nums text-status-approved mt-0.5">{result?.limite_aprovado ? formatBRL(result.limite_aprovado) : formatBRL(c.latestLimiteSugerido)}</p>
                  </div>
                  {result?.prazo_aprovado && (
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>Prazo</p>
                      <p className="text-[14px] font-semibold mt-0.5" style={{ color: T.text }}>{result.prazo_aprovado}d</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Restrições ── */}
      {activeTab === "restricoes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {tabClients.length === 0 ? (
            <EmptyTabState
              icon={AlertCircle}
              title="Nenhum cedente com restrição"
              hint="Aprovações com condicionantes aparecem aqui — os condicionais ficam no card."
            />
          ) : tabClients.map(c => {
            const result = (analyses.find(a => a.client_id === c.id && a.status === "approved_restricted") as any)?.committee_result;
            return (
              <div
                key={c.id}
                className="rounded-[14px] cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(10,21,56,0.08),0_8px_22px_-6px_rgba(10,21,56,0.10)]"
                style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}
                onClick={() => navigate(`/cedentes/${c.id}/perfil`)}
              >
                <div className="px-4 py-3 flex items-center justify-between gap-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                  <div className="min-w-0">
                    <p className="font-semibold text-[13.5px] truncate" style={{ color: T.text }}>{c.razao_social}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.textMute, marginTop: 2 }}>{formatCNPJorCPF(c.cnpj_cpf)}</p>
                  </div>
                  <AlertCircle className="h-5 w-5 text-status-restricted shrink-0" />
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>Score</p>
                      <p className="font-bold text-[14px] tabular-nums mt-0.5" style={{ color: T.text }}>{c.latestScore ?? "—"}</p>
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.10em", textTransform: "uppercase", color: T.textMute }}>Limite c/ restrição</p>
                      <p className="font-bold text-[14px] tabular-nums text-status-restricted mt-0.5">{result?.limite_aprovado ? formatBRL(result.limite_aprovado) : formatBRL(c.latestLimiteSugerido)}</p>
                    </div>
                  </div>
                  {result?.condicoes_adicionais && (
                    <p className="text-[12px] line-clamp-2 pt-2" style={{ color: T.textMute, borderTop: `1px solid ${T.border}` }}>{result.condicoes_adicionais}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Reprovados ── */}
      {activeTab === "reprovados" && (
        <div className="rounded-[14px] overflow-x-auto" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabClients.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum cedente reprovado</TableCell></TableRow>
              ) : tabClients.map(c => {
                const analysis = analyses.find(a => a.client_id === c.id && a.status === "rejected") as any;
                const result = analysis?.committee_result;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.razao_social}</TableCell>
                    <TableCell className="tabular-nums text-xs">{formatCNPJorCPF(c.cnpj_cpf)}</TableCell>
                    <TableCell className="tabular-nums">{c.latestScore ?? "—"}</TableCell>
                    <TableCell className="text-xs">{analysis ? formatDate(analysis.updated_at) : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{result?.condicoes_adicionais || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => navigate(`/analises/nova?client_id=${c.id}`)}>
                        <RotateCcw className="h-3 w-3" /> Re-analisar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Tab: Em Análise / Todos (kanban or table) ── */}
      {(activeTab === "todos" || activeTab === "em-analise") && (view === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-max">
              {stages.filter(s => activeTab === "em-analise" ? ["cadastrado", "draft", "in_committee"].includes(s.key) : true).map((stage) => {
                const items = grouped[stage.key];
                const nextLabel = getCardDestinationLabel(stage.key);
                return (
                  <Droppable droppableId={stage.key} key={stage.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`w-72 flex-shrink-0 rounded-lg transition-colors ${
                          snapshot.isDraggingOver ? "bg-accent/40 ring-2 ring-primary/20" : "bg-transparent"
                        }`}
                      >
                        <div className={`rounded-t-lg border-b-2 px-3 py-2.5 flex items-center justify-between ${stage.borderColor} ${stage.headerBg}`}>
                          <Badge variant="outline" className={`text-xs font-semibold border-0 ${stage.color}`}>
                            {stage.label}
                          </Badge>
                          <span className="text-xs font-bold text-muted-foreground tabular-nums">{items.length}</span>
                        </div>
                        <div className="space-y-2 pt-2 min-h-[200px] px-1">
                          {isLoading ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">Carregando...</div>
                          ) : items.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground">
                              {snapshot.isDraggingOver ? "Solte aqui" : "Nenhum cedente"}
                            </div>
                          ) : (
                            items.map((client, i) => (
                              <Draggable draggableId={client.id} index={i} key={client.id} isDragDisabled={isMutating}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    style={dragProvided.draggableProps.style}
                                  >
                                    <Card
                                      className={`cursor-pointer transition-all border-border/60 ${
                                        dragSnapshot.isDragging
                                          ? "shadow-lg ring-2 ring-primary/30 rotate-1 scale-[1.02]"
                                          : "hover:shadow-md hover:border-primary/30"
                                      }`}
                                      onClick={() => !dragSnapshot.isDragging && navigate(`/cedentes/${client.id}/perfil`)}
                                    >
                                      <CardContent className="p-3 space-y-2">
                                        <div className="flex items-start justify-between gap-1">
                                          <div className="flex items-start gap-1.5 flex-1 min-w-0">
                                            <span {...dragProvided.dragHandleProps} className="mt-0.5 text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0">
                                              <GripVertical className="h-4 w-4" />
                                            </span>
                                            <p className="text-sm font-semibold leading-tight line-clamp-2">{client.razao_social}</p>
                                          </div>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            title="Editar cadastro"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/cedentes/${client.id}`);
                                            }}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 shrink-0"
                                            title="Histórico"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigate(`/cedentes/${client.id}/historico`);
                                            }}
                                          >
                                            <History className="h-3 w-3" />
                                          </Button>
                                          </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground tabular-nums pl-5">
                                          {formatCNPJorCPF(client.cnpj_cpf)}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1 ml-5">
                                          {client.segmento && (
                                            <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                              {client.segmento}
                                            </Badge>
                                          )}
                                          {(clientTagsMap[client.id] || []).map((tag) => (
                                            <Badge
                                              key={tag.id}
                                              variant="outline"
                                              className="text-[10px] px-1.5 py-0 border-0"
                                              style={{ backgroundColor: tag.color + "20", color: tag.color }}
                                            >
                                              {tag.name}
                                            </Badge>
                                          ))}
                                          <ClientTagManager clientId={client.id} compact />
                                        </div>
                                        {client.latestStatus !== "cadastrado" && (
                                          <div className="flex items-center justify-between pt-1 border-t border-border/50 ml-5">
                                            {client.latestScore != null && (
                                              <span className="text-[10px] text-muted-foreground">
                                                Score: <span className="font-semibold text-foreground">{client.latestScore}</span>
                                              </span>
                                            )}
                                            {client.latestLimiteSugerido != null && (
                                              <span className="text-[10px] text-muted-foreground">
                                                {formatBRL(client.latestLimiteSugerido)}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                        {client.latestStatus === "cadastrado" && (
                                          <div className="flex items-center gap-1 pt-1 border-t border-border/50 ml-5">
                                            <FileText className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-[10px] text-muted-foreground">Sem análise</span>
                                          </div>
                                        )}
                                        {nextLabel && (
                                          <p className="text-[9px] text-muted-foreground/60 ml-5">
                                            Arraste → {nextLabel}
                                          </p>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </DragDropContext>
      ) : (
        <div className="rounded-[14px] overflow-x-auto" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)" }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cedente encontrado</TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer" onClick={() => navigate(`/cedentes/${client.id}/perfil`)}>
                    <TableCell className="font-medium">{client.razao_social}</TableCell>
                    <TableCell className="tabular-nums">{formatCNPJorCPF(client.cnpj_cpf)}</TableCell>
                    <TableCell>{client.segmento || "—"}</TableCell>
                    <TableCell>
                      <ClientTagManager clientId={client.id} />
                    </TableCell>
                    <TableCell>{client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "—"}</TableCell>
                    <TableCell>
                      {client.latestStatus === "cadastrado" ? (
                        <Badge variant="outline" className="text-xs border-0 bg-muted/60 text-muted-foreground">Cadastrado</Badge>
                      ) : (
                        <StatusBadge status={client.latestStatus} />
                      )}
                    </TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/cedentes/${client.id}/perfil`); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors"
                          style={{
                            background: `${T.esmeralda}12`,
                            color: T.esmeralda,
                            border: `1px solid ${T.esmeralda}30`,
                          }}
                          title="Perfil 360° (cadastro, análises, contatos, deals)"
                        >
                          <Building2 className="h-3.5 w-3.5" />
                          Perfil
                        </button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Histórico" onClick={(e) => { e.stopPropagation(); navigate(`/cedentes/${client.id}/historico`); }}>
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}

function EmptyTabState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div
      className="col-span-full flex flex-col items-center justify-center py-14 px-6 rounded-[14px] gap-3"
      style={{ background: T.white, border: `1px dashed ${T.borderMed}` }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 44, height: 44, background: T.cinza }}
      >
        <Icon style={{ width: 20, height: 20, color: T.textFaint }} />
      </div>
      <p className="text-center" style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{title}</p>
      {hint && (
        <p className="text-center max-w-sm" style={{ fontSize: 12.5, color: T.textMute, lineHeight: 1.5 }}>{hint}</p>
      )}
    </div>
  );
}
