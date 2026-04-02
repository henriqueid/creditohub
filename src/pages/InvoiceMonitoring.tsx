import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Clock, BarChart3, Search, Users, Plus, Pencil, Trash2, Settings2 } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  valid: { label: "Válida", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  invalid: { label: "Inválida", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
  not_found: { label: "Não Encontrada", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

const frequencyLabels: Record<string, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal",
};

interface MonitoringGroup {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  alerta_email: boolean;
  alerta_sistema: boolean;
  limiar_variacao: number | null;
  limiar_atraso_dias: number | null;
  concentracao_maxima: number | null;
  volume_minimo: number | null;
  is_active: boolean;
  created_at: string;
  clients?: { id: string; razao_social: string; cnpj_cpf: string }[];
}

const emptyGroup = {
  name: "",
  description: "",
  frequency: "daily",
  alerta_email: false,
  alerta_sistema: true,
  limiar_variacao: 20,
  limiar_atraso_dias: 5,
  concentracao_maxima: 30,
  volume_minimo: 0,
  is_active: true,
};

export default function InvoiceMonitoring() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Group state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState(emptyGroup);
  const [selectedGroupClients, setSelectedGroupClients] = useState<string[]>([]);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["monitored-invoices", selectedClient],
    queryFn: async () => {
      let q = supabase.from("monitored_invoices").select("*, clients(razao_social, cnpj_cpf)").order("data_emissao", { ascending: false });
      if (selectedClient !== "all") q = q.eq("client_id", selectedClient);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: sacados } = useQuery({
    queryKey: ["all-sacados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_analysis_sacados").select("sacado_nome, credit_analysis_id, credit_analysis(client_id)");
      if (error) throw error;
      return data;
    },
  });

  // Monitoring groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["monitoring-groups"],
    queryFn: async () => {
      const { data: groupsData, error } = await supabase
        .from("monitoring_groups")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Load clients for each group
      const { data: links, error: linksError } = await supabase
        .from("monitoring_group_clients")
        .select("group_id, client_id, clients(id, razao_social, cnpj_cpf)");
      if (linksError) throw linksError;

      return (groupsData || []).map((g: any) => ({
        ...g,
        clients: (links || [])
          .filter((l: any) => l.group_id === g.id)
          .map((l: any) => l.clients)
          .filter(Boolean),
      })) as MonitoringGroup[];
    },
  });

  // Save group
  const saveGroupMutation = useMutation({
    mutationFn: async () => {
      if (!groupForm.name.trim()) throw new Error("Nome é obrigatório");

      const payload = {
        name: groupForm.name,
        description: groupForm.description || null,
        frequency: groupForm.frequency,
        alerta_email: groupForm.alerta_email,
        alerta_sistema: groupForm.alerta_sistema,
        limiar_variacao: groupForm.limiar_variacao,
        limiar_atraso_dias: groupForm.limiar_atraso_dias,
        concentracao_maxima: groupForm.concentracao_maxima,
        volume_minimo: groupForm.volume_minimo,
        is_active: groupForm.is_active,
      };

      let groupId = editingGroup;

      if (editingGroup) {
        const { error } = await supabase.from("monitoring_groups").update(payload).eq("id", editingGroup);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("monitoring_groups").insert(payload).select("id").single();
        if (error) throw error;
        groupId = data.id;
      }

      // Sync clients
      await supabase.from("monitoring_group_clients").delete().eq("group_id", groupId!);
      if (selectedGroupClients.length > 0) {
        const { error } = await supabase.from("monitoring_group_clients").insert(
          selectedGroupClients.map((cid) => ({ group_id: groupId!, client_id: cid }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingGroup ? "Grupo atualizado" : "Grupo criado com sucesso" });
      queryClient.invalidateQueries({ queryKey: ["monitoring-groups"] });
      setGroupDialogOpen(false);
      setEditingGroup(null);
      setGroupForm(emptyGroup);
      setSelectedGroupClients([]);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("monitoring_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Grupo removido" });
      queryClient.invalidateQueries({ queryKey: ["monitoring-groups"] });
      setDeleteGroupId(null);
    },
  });

  function openEditGroup(group: MonitoringGroup) {
    setEditingGroup(group.id);
    setGroupForm({
      name: group.name,
      description: group.description || "",
      frequency: group.frequency,
      alerta_email: group.alerta_email,
      alerta_sistema: group.alerta_sistema,
      limiar_variacao: group.limiar_variacao ?? 20,
      limiar_atraso_dias: group.limiar_atraso_dias ?? 5,
      concentracao_maxima: group.concentracao_maxima ?? 30,
      volume_minimo: group.volume_minimo ?? 0,
      is_active: group.is_active,
    });
    setSelectedGroupClients(group.clients?.map((c) => c.id) || []);
    setGroupDialogOpen(true);
  }

  function openNewGroup() {
    setEditingGroup(null);
    setGroupForm(emptyGroup);
    setSelectedGroupClients([]);
    setGroupDialogOpen(true);
  }

  // XML Upload handler
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const results: any[] = [];
      for (const file of Array.from(files)) {
        const text = await file.text();
        try {
          const parsed = parseNFXml(text);
          const { error } = await supabase.from("monitored_invoices").insert({
            client_id: selectedClient === "all" ? null : selectedClient,
            ...parsed,
            source: file.name.toLowerCase().endsWith(".xml") ? "xml" : "cnab",
            xml_data: { raw_filename: file.name },
          });
          if (error) throw error;
          results.push({ file: file.name, success: true });
        } catch (e: any) {
          results.push({ file: file.name, success: false, error: e.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      toast({ title: `Upload concluído: ${ok} importadas, ${fail} erros` });
      queryClient.invalidateQueries({ queryKey: ["monitored-invoices"] });
    },
  });

  function parseNFXml(xml: string) {
    const get = (tag: string) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
      return match ? match[1].trim() : null;
    };
    return {
      chave_acesso: get("chNFe") || get("infNFe")?.match(/Id="NFe(\d+)"/)?.[1] || null,
      numero_nf: get("nNF"),
      serie: get("serie"),
      data_emissao: get("dhEmi")?.substring(0, 10) || get("dEmi"),
      valor: get("vNF") ? parseFloat(get("vNF")!) : null,
      destinatario_cnpj: get("dest")
        ? (xml.match(/<dest>[\s\S]*?<CNPJ>(\d+)<\/CNPJ>/)?.[1] || xml.match(/<dest>[\s\S]*?<CPF>(\d+)<\/CPF>/)?.[1])
        : null,
      destinatario_nome: xml.match(/<dest>[\s\S]*?<xNome>([^<]+)<\/xNome>/)?.[1] || null,
      natureza_operacao: get("natOp"),
      validation_status: "pending" as const,
    };
  }

  const crossReferenceData = useMemo(() => {
    if (!invoices || !sacados) return [];
    const sacadoNames = new Set(sacados.map((s) => s.sacado_nome?.toLowerCase()));
    return invoices.map((inv: any) => ({
      ...inv,
      matchesSacado: inv.destinatario_nome ? sacadoNames.has(inv.destinatario_nome.toLowerCase()) : false,
    }));
  }, [invoices, sacados]);

  const volumeHistory = useMemo(() => {
    if (!invoices) return [];
    const byMonth: Record<string, { month: string; total: number; count: number }> = {};
    invoices.forEach((inv: any) => {
      if (!inv.data_emissao) return;
      const month = inv.data_emissao.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { month, total: 0, count: 0 };
      byMonth[month].total += inv.valor || 0;
      byMonth[month].count += 1;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  const stats = useMemo(() => {
    if (!invoices) return { total: 0, valid: 0, invalid: 0, pending: 0, totalValue: 0 };
    return {
      total: invoices.length,
      valid: invoices.filter((i: any) => i.validation_status === "valid").length,
      invalid: invoices.filter((i: any) => ["invalid", "cancelled", "not_found"].includes(i.validation_status)).length,
      pending: invoices.filter((i: any) => i.validation_status === "pending").length,
      totalValue: invoices.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!crossReferenceData) return [];
    if (!search) return crossReferenceData;
    const s = search.toLowerCase();
    return crossReferenceData.filter(
      (i: any) =>
        i.numero_nf?.toLowerCase().includes(s) ||
        i.destinatario_nome?.toLowerCase().includes(s) ||
        i.destinatario_cnpj?.includes(s) ||
        i.chave_acesso?.includes(s)
    );
  }, [crossReferenceData, search]);

  function toggleGroupClient(clientId: string) {
    setSelectedGroupClients((prev) =>
      prev.includes(clientId) ? prev.filter((c) => c !== clientId) : [...prev, clientId]
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento de Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm">
            Importe NFs via XML/CNAB, valide e cruze com sacados da análise de crédito.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por cedente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cedentes</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".xml,.cnab,.rem,.ret,.txt";
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) uploadMutation.mutate(files);
              };
              input.click();
            }}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? "Importando..." : "Importar XML/CNAB"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total NFs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-xs text-muted-foreground">Válidas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-xs text-muted-foreground">Inválidas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{formatBRL(stats.totalValue)}</div>
            <div className="text-xs text-muted-foreground">Valor Total</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><FileText className="h-3.5 w-3.5 mr-1" /> Lista de NFs</TabsTrigger>
          <TabsTrigger value="groups"><Users className="h-3.5 w-3.5 mr-1" /> Grupos de Monitoramento</TabsTrigger>
          <TabsTrigger value="cross"><Search className="h-3.5 w-3.5 mr-1" /> Cruzamento Sacados</TabsTrigger>
          <TabsTrigger value="volume"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Evolução Volume</TabsTrigger>
        </TabsList>

        {/* ===== NFs List Tab ===== */}
        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Buscar por NF, destinatário, CNPJ ou chave..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF</TableHead>
                    <TableHead>Cedente</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Nat. Operação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma NF encontrada. Importe XMLs para começar.</TableCell></TableRow>
                  ) : (
                    filtered.slice(0, 100).map((inv: any) => {
                      const st = statusConfig[inv.validation_status] || statusConfig.pending;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.numero_nf || "—"}</TableCell>
                          <TableCell className="text-sm">{inv.clients?.razao_social || "—"}</TableCell>
                          <TableCell>
                            <div className="text-sm">{inv.destinatario_nome || "—"}</div>
                            <div className="text-xs text-muted-foreground font-mono">{inv.destinatario_cnpj || ""}</div>
                          </TableCell>
                          <TableCell className="text-sm">{inv.data_emissao || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{inv.valor ? formatBRL(inv.valor) : "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.natureza_operacao || "—"}</TableCell>
                          <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{inv.source?.toUpperCase()}</Badge></TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Groups Tab ===== */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex items-center justify-between">
            <CardDescription>Crie grupos de monitoramento com parâmetros e alertas configuráveis para acompanhar cedentes.</CardDescription>
            <Button onClick={openNewGroup}><Plus className="mr-2 h-4 w-4" /> Novo Grupo</Button>
          </div>

          {groupsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando grupos...</div>
          ) : !groups || groups.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Users className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p>Nenhum grupo de monitoramento criado.</p>
                <Button variant="outline" className="mt-4" onClick={openNewGroup}>
                  <Plus className="mr-2 h-4 w-4" /> Criar primeiro grupo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => (
                <Card key={g.id} className={!g.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {g.name}
                        {!g.is_active && <Badge variant="outline" className="text-xs">Inativo</Badge>}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGroup(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteGroupId(g.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {g.description && <CardDescription className="text-xs">{g.description}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Params */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Frequência</div>
                        <div className="font-medium">{frequencyLabels[g.frequency] || g.frequency}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Variação Máx.</div>
                        <div className="font-medium">{g.limiar_variacao ?? 0}%</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Atraso Máx.</div>
                        <div className="font-medium">{g.limiar_atraso_dias ?? 0} dias</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Concentração Máx.</div>
                        <div className="font-medium">{g.concentracao_maxima ?? 0}%</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Volume Mínimo</div>
                        <div className="font-medium">{formatBRL(g.volume_minimo ?? 0)}</div>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <div className="text-muted-foreground">Alertas</div>
                        <div className="font-medium flex gap-1">
                          {g.alerta_sistema && <Badge variant="outline" className="text-[10px] px-1">Sistema</Badge>}
                          {g.alerta_email && <Badge variant="outline" className="text-[10px] px-1">E-mail</Badge>}
                          {!g.alerta_sistema && !g.alerta_email && <span className="text-muted-foreground">Nenhum</span>}
                        </div>
                      </div>
                    </div>

                    {/* Clients */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Cedentes ({g.clients?.length || 0})</div>
                      {!g.clients || g.clients.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhum cedente vinculado</p>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {g.clients.slice(0, 5).map((c) => (
                            <Badge key={c.id} variant="secondary" className="text-[10px]">{c.razao_social}</Badge>
                          ))}
                          {g.clients.length > 5 && (
                            <Badge variant="outline" className="text-[10px]">+{g.clients.length - 5}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== Cross-reference Tab ===== */}
        <TabsContent value="cross" className="space-y-4">
          <CardDescription>NFs cujo destinatário coincide (ou não) com sacados cadastrados nas análises de crédito.</CardDescription>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Match com Sacados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {crossReferenceData.filter((i: any) => i.matchesSacado).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma NF coincide com sacados cadastrados.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {crossReferenceData.filter((i: any) => i.matchesSacado).map((inv: any) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-1">
                        <span>{inv.destinatario_nome}</span>
                        <span className="font-mono">{inv.valor ? formatBRL(inv.valor) : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Sem Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                {crossReferenceData.filter((i: any) => !i.matchesSacado && i.destinatario_nome).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todas as NFs coincidem ou não há dados.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {crossReferenceData.filter((i: any) => !i.matchesSacado && i.destinatario_nome).slice(0, 50).map((inv: any) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-1">
                        <span>{inv.destinatario_nome}</span>
                        <span className="font-mono">{inv.valor ? formatBRL(inv.valor) : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== Volume Tab ===== */}
        <TabsContent value="volume" className="space-y-4">
          <CardDescription>Evolução mensal do volume de NFs importadas e valores.</CardDescription>
          {volumeHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Importe NFs para visualizar a evolução do faturamento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Volume Financeiro (R$)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={volumeHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Quantidade de NFs</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={volumeHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== Group Dialog ===== */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {editingGroup ? "Editar Grupo" : "Novo Grupo de Monitoramento"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome do Grupo *</Label>
                <Input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ex: Cedentes Tier 1" />
              </div>
              <div className="space-y-2">
                <Label>Frequência de Verificação</Label>
                <Select value={groupForm.frequency} onValueChange={(v) => setGroupForm({ ...groupForm, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} placeholder="Descrição do grupo..." rows={2} />
            </div>

            {/* Parameters */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Parâmetros de Alerta</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Limiar de Variação (%)</Label>
                  <Input type="number" value={groupForm.limiar_variacao} onChange={(e) => setGroupForm({ ...groupForm, limiar_variacao: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Alerta quando a variação de volume exceder este percentual</p>
                </div>
                <div className="space-y-2">
                  <Label>Atraso Máximo (dias)</Label>
                  <Input type="number" value={groupForm.limiar_atraso_dias} onChange={(e) => setGroupForm({ ...groupForm, limiar_atraso_dias: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Alerta quando não houver NFs nos últimos X dias</p>
                </div>
                <div className="space-y-2">
                  <Label>Concentração Máxima (%)</Label>
                  <Input type="number" value={groupForm.concentracao_maxima} onChange={(e) => setGroupForm({ ...groupForm, concentracao_maxima: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Alerta se um sacado concentrar mais que este % do faturamento</p>
                </div>
                <div className="space-y-2">
                  <Label>Volume Mínimo (R$)</Label>
                  <Input type="number" value={groupForm.volume_minimo} onChange={(e) => setGroupForm({ ...groupForm, volume_minimo: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground">Alerta se o volume do período ficar abaixo deste valor</p>
                </div>
              </div>
            </div>

            {/* Alerts */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Canais de Alerta</h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={groupForm.alerta_sistema} onCheckedChange={(v) => setGroupForm({ ...groupForm, alerta_sistema: v })} />
                  <Label>Alerta no Sistema</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={groupForm.alerta_email} onCheckedChange={(v) => setGroupForm({ ...groupForm, alerta_email: v })} />
                  <Label>Alerta por E-mail</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={groupForm.is_active} onCheckedChange={(v) => setGroupForm({ ...groupForm, is_active: v })} />
                  <Label>Grupo Ativo</Label>
                </div>
              </div>
            </div>

            {/* Client selection */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Cedentes do Grupo ({selectedGroupClients.length} selecionados)</h3>
              {!clients || clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum cedente cadastrado.</p>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {clients.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      onClick={() => toggleGroupClient(c.id)}
                    >
                      <Checkbox checked={selectedGroupClients.includes(c.id)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{c.razao_social}</div>
                        <div className="text-xs text-muted-foreground font-mono">{c.cnpj_cpf}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveGroupMutation.mutate()} disabled={saveGroupMutation.isPending}>
              {saveGroupMutation.isPending ? "Salvando..." : editingGroup ? "Salvar Alterações" : "Criar Grupo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {deleteGroupId && (
        <Dialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir este grupo? Os cedentes vinculados serão desvinculados.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteGroupId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deleteGroupMutation.mutate(deleteGroupId)} disabled={deleteGroupMutation.isPending}>
                {deleteGroupMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
