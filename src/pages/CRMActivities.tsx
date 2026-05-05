import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Phone, Mail, Users, FileText, MessageSquare, Calendar, Building2, Search, Filter, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const ACTIVITY_TYPES = [
  { value: "call", label: "Ligação", icon: Phone, color: "text-sink-mint-3" },
  { value: "email", label: "Email", icon: Mail, color: "text-sink-warn" },
  { value: "meeting", label: "Reunião", icon: Users, color: "text-status-approved" },
  { value: "note", label: "Nota", icon: FileText, color: "text-muted-foreground" },
  { value: "message", label: "Mensagem", icon: MessageSquare, color: "text-sink-mint" },
];

const OWNER_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "mine", label: "Minhas" },
  { value: "team", label: "Equipe" },
];

export default function CRMActivities() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [form, setForm] = useState({ client_id: "", activity_type: "call", description: "", created_by: "" });

  const { data: currentProfile } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (currentProfile?.full_name && !form.created_by) {
      setForm(p => ({ ...p, created_by: currentProfile.full_name! }));
    }
  }, [currentProfile?.full_name]);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data } = await supabase.from("activities").select("*, clients(razao_social), contacts(name)").order("activity_date", { ascending: false }).limit(100);
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

  const createActivity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("activities").insert({
        client_id: form.client_id,
        activity_type: form.activity_type,
        description: form.description,
        created_by: form.created_by || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      setDialogOpen(false);
      setForm({ client_id: "", activity_type: "call", description: "", created_by: currentProfile?.full_name || "" });
      toast.success("Atividade registrada!");
    },
    onError: () => toast.error("Erro ao registrar atividade"),
  });

  const userName = currentProfile?.full_name?.toLowerCase() || "";

  const filtered = activities.filter((a: any) => {
    const matchSearch = !search || a.description?.toLowerCase().includes(search.toLowerCase()) || (a.clients as any)?.razao_social?.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.activity_type === typeFilter;
    const matchOwner = ownerFilter === "all"
      || (ownerFilter === "mine" && a.created_by?.toLowerCase() === userName)
      || (ownerFilter === "team" && a.created_by?.toLowerCase() !== userName);
    return matchSearch && matchType && matchOwner;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Atividades</h1>
          <p className="text-sm text-muted-foreground">Histórico de interações com clientes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Atividade</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Registrar Atividade</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.client_id} onValueChange={v => setForm(p => ({ ...p, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.activity_type} onValueChange={v => setForm(p => ({ ...p, activity_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Detalhes da interação..." />
              </div>
              <div>
                <Label>Registrado por</Label>
                <Input value={form.created_by} onChange={e => setForm(p => ({ ...p, created_by: e.target.value }))} placeholder="Seu nome" />
              </div>
              <Button className="w-full" onClick={() => createActivity.mutate()} disabled={!form.client_id || !form.description}>Registrar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar atividades..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex rounded-md border border-border overflow-hidden">
          {OWNER_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setOwnerFilter(f.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors",
                ownerFilter === f.value ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {f.value === "mine" && <User className="h-3 w-3 inline mr-1" />}
              {f.label}
            </button>
          ))}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {filtered.map((a: any) => {
          const typeInfo = ACTIVITY_TYPES.find(t => t.value === a.activity_type) || ACTIVITY_TYPES[3];
          const Icon = typeInfo.icon;
          return (
            <div key={a.id} className="flex gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
              <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border/50", typeInfo.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] h-5">{typeInfo.label}</Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {(a.clients as any)?.razao_social}
                  </span>
                  {a.created_by && <span className="text-[10px] text-muted-foreground">por {a.created_by}</span>}
                </div>
                <p className="text-sm text-foreground mt-1 leading-relaxed">{a.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(a.activity_date).toLocaleDateString("pt-BR")} às {new Date(a.activity_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma atividade registrada</p>
          </div>
        )}
      </div>
    </div>
  );
}
