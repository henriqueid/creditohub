import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, History, LayoutGrid, List, FileText, Building2, GripVertical, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate, formatBRL } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { ClientTagManager, TagFilter, useAllClientTags } from "@/components/ClientTagManager";

type KanbanStage = "cadastrado" | "draft" | "in_committee" | "approved" | "approved_restricted" | "rejected";

const stages: { key: KanbanStage; label: string; color: string; borderColor: string; headerBg: string }[] = [
  { key: "cadastrado", label: "Cadastrado", color: "bg-muted/60 text-muted-foreground", borderColor: "border-muted-foreground/30", headerBg: "bg-muted/30" },
  { key: "draft", label: "Em Análise", color: "bg-status-draft/10 text-status-draft", borderColor: "border-status-draft/40", headerBg: "bg-status-draft/5" },
  { key: "in_committee", label: "Em Comitê", color: "bg-status-committee/10 text-status-committee", borderColor: "border-status-committee/40", headerBg: "bg-status-committee/5" },
  { key: "approved", label: "Aprovado", color: "bg-status-approved/10 text-status-approved", borderColor: "border-status-approved/40", headerBg: "bg-status-approved/5" },
  { key: "approved_restricted", label: "Aprovado c/ Restrição", color: "bg-status-restricted/10 text-status-restricted", borderColor: "border-status-restricted/40", headerBg: "bg-status-restricted/5" },
  { key: "rejected", label: "Reprovado", color: "bg-status-rejected/10 text-status-rejected", borderColor: "border-status-rejected/40", headerBg: "bg-status-rejected/5" },
];

// Which transitions are allowed via drag
const allowedTransitions: Record<KanbanStage, KanbanStage[]> = {
  cadastrado: ["draft"],
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
  latestStatus: KanbanStage;
  latestAnalysisId: string | null;
  latestLimiteSugerido: number | null;
  latestScore: number | null;
}

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");

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
        .select("id, client_id, status, limite_sugerido, credit_score, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const enrichedClients = useMemo<ClientWithAnalysis[]>(() => {
    return clients.map((c) => {
      const latest = analyses.filter((a) => a.client_id === c.id)[0];
      return {
        ...c,
        latestStatus: latest ? (latest.status as KanbanStage) : "cadastrado",
        latestAnalysisId: latest?.id ?? null,
        latestLimiteSugerido: latest?.limite_sugerido ?? null,
        latestScore: latest?.credit_score ?? null,
      };
    });
  }, [clients, analyses]);

  const filtered = useMemo(() => {
    if (!search) return enrichedClients;
    const q = search.toLowerCase();
    return enrichedClients.filter(
      (c) =>
        c.razao_social.toLowerCase().includes(q) ||
        c.cnpj_cpf.includes(q) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(q))
    );
  }, [enrichedClients, search]);

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
    if (client.latestStatus === "cadastrado") {
      navigate(`/cedentes/${client.id}`);
    } else if (client.latestStatus === "in_committee" && client.latestAnalysisId) {
      navigate(`/comite/${client.latestAnalysisId}`);
    } else if (client.latestAnalysisId) {
      navigate(`/analises/${client.latestAnalysisId}`);
    } else {
      navigate(`/cedentes/${client.id}`);
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cedentes</h1>
          <p className="text-muted-foreground">Arraste os cards para avançar etapas ou clique para abrir</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" className="h-8 px-3" onClick={() => setView("kanban")}>
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </Button>
            <Button variant={view === "table" ? "default" : "ghost"} size="sm" className="h-8 px-3" onClick={() => setView("table")}>
              <List className="h-4 w-4 mr-1" /> Tabela
            </Button>
          </div>
          <Button onClick={() => navigate("/cedentes/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo Cedente
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {view === "kanban" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-max">
              {stages.map((stage) => {
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
                                      onClick={() => !dragSnapshot.isDragging && handleCardClick(client)}
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
                                        {client.segmento && (
                                          <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0 ml-5">
                                            {client.segmento}
                                          </Badge>
                                        )}
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
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ/CPF</TableHead>
                <TableHead>Segmento</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cedente encontrado</TableCell>
                </TableRow>
              ) : (
                filtered.map((client) => (
                  <TableRow key={client.id} className="cursor-pointer" onClick={() => handleCardClick(client)}>
                    <TableCell className="font-medium">{client.razao_social}</TableCell>
                    <TableCell className="tabular-nums">{formatCNPJorCPF(client.cnpj_cpf)}</TableCell>
                    <TableCell>{client.segmento || "—"}</TableCell>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate(`/cedentes/${client.id}/historico`); }}>
                        <History className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
