import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, History, LayoutGrid, List, FileText, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate, formatBRL, statusLabels, statusColors } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

type KanbanStage = "cadastrado" | "draft" | "in_committee" | "approved" | "approved_restricted" | "rejected";

const stages: { key: KanbanStage; label: string; color: string; borderColor: string }[] = [
  { key: "cadastrado", label: "Cadastrado", color: "bg-muted/60 text-muted-foreground", borderColor: "border-muted-foreground/30" },
  { key: "draft", label: "Em Análise", color: "bg-status-draft/10 text-status-draft", borderColor: "border-status-draft/40" },
  { key: "in_committee", label: "Em Comitê", color: "bg-status-committee/10 text-status-committee", borderColor: "border-status-committee/40" },
  { key: "approved", label: "Aprovado", color: "bg-status-approved/10 text-status-approved", borderColor: "border-status-approved/40" },
  { key: "approved_restricted", label: "Aprovado c/ Restrição", color: "bg-status-restricted/10 text-status-restricted", borderColor: "border-status-restricted/40" },
  { key: "rejected", label: "Reprovado", color: "bg-status-rejected/10 text-status-rejected", borderColor: "border-status-rejected/40" },
];

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
  latestDate: string | null;
}

export default function Clients() {
  const navigate = useNavigate();
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
      const clientAnalyses = analyses.filter((a) => a.client_id === c.id);
      const latest = clientAnalyses[0];
      return {
        ...c,
        latestStatus: latest ? (latest.status as KanbanStage) : "cadastrado",
        latestAnalysisId: latest?.id ?? null,
        latestLimiteSugerido: latest?.limite_sugerido ?? null,
        latestScore: latest?.credit_score ?? null,
        latestDate: latest?.created_at ?? null,
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cedentes</h1>
          <p className="text-muted-foreground">Cadastro e acompanhamento de clientes cedentes</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-card p-0.5">
            <Button
              variant={view === "kanban" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </Button>
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3"
              onClick={() => setView("table")}
            >
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
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {view === "kanban" ? (
        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4 min-w-max">
            {stages.map((stage) => {
              const items = grouped[stage.key];
              return (
                <div key={stage.key} className="w-72 flex-shrink-0">
                  <div className={`rounded-t-lg border-b-2 px-3 py-2.5 flex items-center justify-between ${stage.borderColor}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs font-semibold border-0 ${stage.color}`}>
                        {stage.label}
                      </Badge>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <div className="space-y-2 pt-2 min-h-[200px]">
                    {isLoading ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">Carregando...</div>
                    ) : items.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">Nenhum cedente</div>
                    ) : (
                      items.map((client, i) => (
                        <motion.div
                          key={client.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Card
                            className="cursor-pointer hover:shadow-md transition-shadow border-border/60 hover:border-primary/30"
                            onClick={() => handleCardClick(client)}
                          >
                            <CardContent className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-semibold leading-tight line-clamp-2">
                                  {client.razao_social}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/cedentes/${client.id}/historico`);
                                  }}
                                >
                                  <History className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {formatCNPJorCPF(client.cnpj_cpf)}
                              </p>
                              {client.segmento && (
                                <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                                  {client.segmento}
                                </Badge>
                              )}
                              {client.latestStatus !== "cadastrado" && (
                                <div className="flex items-center justify-between pt-1 border-t border-border/50">
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
                                <div className="flex items-center gap-1 pt-1 border-t border-border/50">
                                  <FileText className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-[10px] text-muted-foreground">Sem análise</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/cedentes/${client.id}`)}
                  >
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/cedentes/${client.id}/historico`);
                        }}
                      >
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
