import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle, Building2, Calendar, Search, Filter, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const PRIORITIES = [
  { value: "low", label: "Baixa", color: "text-muted-foreground bg-muted" },
  { value: "medium", label: "Média", color: "text-sink-warn bg-sink-warn/10" },
  { value: "high", label: "Alta", color: "text-sink-danger bg-sink-danger/10" },
];

const STATUSES = [
  { value: "pending", label: "Pendente", icon: Circle },
  { value: "in_progress", label: "Em andamento", icon: Clock },
  { value: "completed", label: "Concluída", icon: CheckCircle2 },
];

export default function CRMTasks() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [form, setForm] = useState({ title: "", description: "", client_id: "", priority: "medium", assigned_to: "", due_date: "" });

  const { data: tasks = [] } = useQuery({
    queryKey: ["crm-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("crm_tasks").select("*, clients(razao_social)").order("due_date", { ascending: true });
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social").order("razao_social");
      return data || [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crm_tasks").insert({
        title: form.title,
        description: form.description || null,
        client_id: form.client_id || null,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-tasks"] });
      setDialogOpen(false);
      setForm({ title: "", description: "", client_id: "", priority: "medium", assigned_to: "", due_date: "" });
      toast.success("Tarefa criada!");
    },
    onError: () => toast.error("Erro ao criar tarefa"),
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const update: any = { status: newStatus };
      if (newStatus === "completed") update.completed_at = new Date().toISOString();
      else update.completed_at = null;
      const { error } = await supabase.from("crm_tasks").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crm-tasks"] }); toast.success("Tarefa removida"); },
  });

  const filtered = tasks.filter((t: any) => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isOverdue = (t: any) => t.due_date && t.status !== "completed" && new Date(t.due_date) < new Date();

  const pendingCount = tasks.filter((t: any) => t.status === "pending").length;
  const overdueCount = tasks.filter((t: any) => isOverdue(t)).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Tarefas</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
            {overdueCount > 0 && <span className="text-destructive ml-1">• {overdueCount} atrasada{overdueCount !== 1 ? "s" : ""}</span>}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Tarefa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div>
                <Label>Cliente</Label>
                <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Prazo</Label><Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} /></div>
              </div>
              <div><Label>Responsável</Label><Input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
              <Button className="w-full" onClick={() => createTask.mutate()} disabled={!form.title}>Criar Tarefa</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar tarefas..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {filtered.map((t: any) => {
          const priority = PRIORITIES.find(p => p.value === t.priority) || PRIORITIES[1];
          const status = STATUSES.find(s => s.value === t.status) || STATUSES[0];
          const StatusIcon = status.icon;
          const overdue = isOverdue(t);
          const nextStatus = t.status === "pending" ? "in_progress" : t.status === "in_progress" ? "completed" : "pending";

          return (
            <div key={t.id} className={cn("flex items-center gap-3 p-3 rounded-lg border transition-colors", overdue ? "border-destructive/30 bg-destructive/5" : "border-border/50 hover:bg-muted/30")}>
              <button onClick={() => toggleStatus.mutate({ id: t.id, newStatus: nextStatus })} className="shrink-0">
                <StatusIcon className={cn("h-5 w-5", t.status === "completed" ? "text-status-approved" : overdue ? "text-destructive" : "text-muted-foreground")} />
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", t.status === "completed" && "line-through text-muted-foreground")}>{t.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {(t.clients as any)?.razao_social && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building2 className="h-3 w-3" />{(t.clients as any).razao_social}</span>
                  )}
                  {t.due_date && (
                    <span className={cn("text-[10px] flex items-center gap-0.5", overdue ? "text-destructive font-medium" : "text-muted-foreground")}>
                      {overdue && <AlertTriangle className="h-3 w-3" />}
                      <Calendar className="h-3 w-3" />
                      {new Date(t.due_date).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  {t.assigned_to && <span className="text-[10px] text-muted-foreground">→ {t.assigned_to}</span>}
                </div>
              </div>
              <Badge variant="outline" className={cn("text-[10px] h-5", priority.color)}>{priority.label}</Badge>
              <button onClick={() => deleteTask.mutate(t.id)} className="p-1 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive/60" /></button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
