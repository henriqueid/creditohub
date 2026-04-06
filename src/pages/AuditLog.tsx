import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  History, Search, Plus, Pencil, Trash2, Filter, Eye, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  insert: { label: "Criação", icon: Plus, color: "bg-status-approved/15 text-status-approved border-status-approved/30" },
  update: { label: "Alteração", icon: Pencil, color: "bg-status-committee/15 text-status-committee border-status-committee/30" },
  delete: { label: "Exclusão", icon: Trash2, color: "bg-status-rejected/15 text-status-rejected border-status-rejected/30" },
};

const TABLE_LABELS: Record<string, string> = {
  credit_analysis: "Análise de Crédito",
  blacklist: "Blacklist",
  credit_engine_rules: "Motor de Crédito",
  system_settings: "Configurações",
  committee_result: "Resultado Comitê",
  monitoring_groups: "Grupo Monitoramento",
};

const PAGE_SIZE = 25;

type AuditEntry = {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_by: string | null;
  created_at: string;
};

export default function AuditLog() {
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditEntry | null>(null);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["audit-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name");
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const m: Record<string, string> = {};
    profiles.forEach(p => { m[p.user_id] = p.full_name || "—"; });
    return m;
  }, [profiles]);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (tableFilter !== "all" && e.table_name !== tableFilter) return false;
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = profileMap[e.changed_by || ""] || "";
        const table = TABLE_LABELS[e.table_name] || e.table_name;
        if (!table.toLowerCase().includes(q) && !name.toLowerCase().includes(q) && !e.record_id.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, tableFilter, actionFilter, search, profileMap]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const tables = [...new Set(entries.map(e => e.table_name))];

  function getChangedFields(entry: AuditEntry): string[] {
    if (entry.action !== "update" || !entry.old_data || !entry.new_data) return [];
    const keys = new Set([...Object.keys(entry.old_data), ...Object.keys(entry.new_data)]);
    const changed: string[] = [];
    keys.forEach(k => {
      if (["updated_at", "created_at"].includes(k)) return;
      if (JSON.stringify(entry.old_data![k]) !== JSON.stringify(entry.new_data![k])) {
        changed.push(k);
      }
    });
    return changed;
  }

  function getRecordLabel(entry: AuditEntry): string {
    const d = entry.new_data || entry.old_data;
    if (!d) return entry.record_id.slice(0, 8);
    if (d.razao_social) return d.razao_social;
    if (d.rule_name) return d.rule_name;
    if (d.name) return d.name;
    if (d.documento) return d.documento;
    if (d.key) return d.key;
    if (d.decisao_final) return d.decisao_final;
    return entry.record_id.slice(0, 8);
  }

  return (
    <div className="p-6 space-y-6 overflow-auto">
      <motion.div
        className="flex items-center justify-between flex-wrap gap-3"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Histórico de Alterações
          </h1>
          <p className="text-muted-foreground text-sm">Rastreie todas as modificações em análises, configurações e restrições</p>
        </div>
        <Badge variant="outline" className="text-xs tabular-nums">{filtered.length} registro(s)</Badge>
      </motion.div>

      {/* Filters */}
      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por registro, tabela ou usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tableFilter} onValueChange={v => { setTableFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as tabelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as tabelas</SelectItem>
            {tables.map(t => (
              <SelectItem key={t} value={t}>{TABLE_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Todas as ações" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="insert">Criação</SelectItem>
            <SelectItem value="update">Alteração</SelectItem>
            <SelectItem value="delete">Exclusão</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="glass-card">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <History className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-[140px]">Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Tabela</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Campos Alterados</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paged.map((entry, idx) => {
                        const cfg = ACTION_CONFIG[entry.action] || ACTION_CONFIG.update;
                        const ActionIcon = cfg.icon;
                        const changed = getChangedFields(entry);
                        return (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02, duration: 0.25 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                              {format(new Date(entry.created_at), "dd/MM/yy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-[10px] gap-1 border", cfg.color)}>
                                <ActionIcon className="h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {TABLE_LABELS[entry.table_name] || entry.table_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                              {getRecordLabel(entry)}
                            </TableCell>
                            <TableCell>
                              {changed.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {changed.slice(0, 3).map(f => (
                                    <span key={f} className="text-[9px] bg-muted rounded px-1.5 py-0.5 text-muted-foreground">
                                      {f}
                                    </span>
                                  ))}
                                  {changed.length > 3 && (
                                    <span className="text-[9px] text-muted-foreground">+{changed.length - 3}</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-foreground">
                              {profileMap[entry.changed_by || ""] || "Sistema"}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(entry)}>
                                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Página {page + 1} de {totalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <History className="h-5 w-5 text-primary" />
              Detalhe da Alteração
            </DialogTitle>
            <DialogDescription>
              {detail && `${ACTION_CONFIG[detail.action]?.label || detail.action} em ${TABLE_LABELS[detail.table_name] || detail.table_name}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Data/Hora</p>
                  <p className="text-foreground tabular-nums">{format(new Date(detail.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Usuário</p>
                  <p className="text-foreground">{profileMap[detail.changed_by || ""] || "Sistema"}</p>
                </div>
              </div>

              {detail.action === "update" && detail.old_data && detail.new_data && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Campos Alterados</p>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Campo</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Antes</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Depois</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getChangedFields(detail).map(field => (
                          <tr key={field} className="border-t border-border/30">
                            <td className="px-3 py-2 font-mono text-[11px] text-foreground">{field}</td>
                            <td className="px-3 py-2 text-status-rejected max-w-[200px] truncate">
                              {JSON.stringify(detail.old_data![field]) ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-status-approved max-w-[200px] truncate">
                              {JSON.stringify(detail.new_data![field]) ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {(detail.action === "insert" || detail.action === "delete") && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">
                    {detail.action === "insert" ? "Dados Criados" : "Dados Excluídos"}
                  </p>
                  <pre className="text-[11px] bg-muted/30 rounded-lg p-3 overflow-x-auto max-h-64 text-foreground">
                    {JSON.stringify(detail.action === "insert" ? detail.new_data : detail.old_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
