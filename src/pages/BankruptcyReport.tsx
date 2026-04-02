import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, AlertTriangle, Scale, ShieldAlert, Search, Link2 } from "lucide-react";

const typeConfig: Record<string, { label: string; color: string }> = {
  falencia: { label: "Falência", color: "bg-red-100 text-red-800" },
  recuperacao_judicial: { label: "Recuperação Judicial", color: "bg-orange-100 text-orange-800" },
  recuperacao_extrajudicial: { label: "Recuperação Extrajudicial", color: "bg-yellow-100 text-yellow-800" },
  liquidacao: { label: "Liquidação", color: "bg-gray-100 text-gray-800" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-800" },
  deferido: { label: "Deferido", color: "bg-green-100 text-green-800" },
  indeferido: { label: "Indeferido", color: "bg-gray-100 text-gray-800" },
  encerrado: { label: "Encerrado", color: "bg-slate-100 text-slate-800" },
};

interface BankruptcyForm {
  company_name: string;
  document: string;
  type: string;
  status: string;
  court: string;
  process_number: string;
  filing_date: string;
  source: string;
  notes: string;
}

const emptyForm: BankruptcyForm = {
  company_name: "",
  document: "",
  type: "falencia",
  status: "em_andamento",
  court: "",
  process_number: "",
  filing_date: "",
  source: "manual",
  notes: "",
};

export default function BankruptcyReport() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<BankruptcyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const { data: records, isLoading } = useQuery({
    queryKey: ["bankruptcy-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bankruptcy_records")
        .select("*, clients(razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Load clients and sacados for cross-referencing
  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: sacados } = useQuery({
    queryKey: ["all-sacados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_analysis_sacados").select("sacado_nome");
      if (error) throw error;
      return data;
    },
  });

  // Cross-reference logic
  const crossReference = (companyName: string, doc: string) => {
    const matchedClient = clients?.find(
      (c) => c.cnpj_cpf === doc || c.razao_social.toLowerCase() === companyName.toLowerCase()
    );
    const matchedSacadoNames = sacados
      ?.filter((s) => s.sacado_nome?.toLowerCase() === companyName.toLowerCase())
      .map((s) => s.sacado_nome) || [];
    return { matchedClient, matchedSacadoNames };
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { matchedClient, matchedSacadoNames } = crossReference(form.company_name, form.document);
      const payload: any = {
        company_name: form.company_name,
        document: form.document || null,
        type: form.type,
        status: form.status,
        court: form.court || null,
        process_number: form.process_number || null,
        filing_date: form.filing_date || null,
        source: form.source,
        notes: form.notes || null,
        matched_client_id: matchedClient?.id || null,
        matched_sacado_names: matchedSacadoNames.length > 0 ? matchedSacadoNames : null,
      };
      if (editingId) {
        const { error } = await supabase.from("bankruptcy_records").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bankruptcy_records").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      const { matchedClient, matchedSacadoNames } = crossReference(form.company_name, form.document);
      const alerts: string[] = [];
      if (matchedClient) alerts.push(`⚠️ Coincide com o cedente: ${matchedClient.razao_social}`);
      if (matchedSacadoNames.length > 0) alerts.push(`⚠️ Coincide com sacado(s) na carteira`);

      toast({
        title: editingId ? "Registro atualizado!" : "Registro adicionado!",
        description: alerts.length > 0 ? alerts.join(" | ") : undefined,
        variant: alerts.length > 0 ? "destructive" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["bankruptcy-records"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bankruptcy_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Registro removido" });
      queryClient.invalidateQueries({ queryKey: ["bankruptcy-records"] });
    },
  });

  const openEdit = (item: any) => {
    setForm({
      company_name: item.company_name,
      document: item.document || "",
      type: item.type,
      status: item.status,
      court: item.court || "",
      process_number: item.process_number || "",
      filing_date: item.filing_date || "",
      source: item.source,
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const filtered = useMemo(() => {
    if (!records) return [];
    return records.filter((r: any) => {
      const matchSearch = !search ||
        r.company_name?.toLowerCase().includes(search.toLowerCase()) ||
        r.document?.includes(search) ||
        r.process_number?.includes(search);
      const matchType = filterType === "all" || r.type === filterType;
      return matchSearch && matchType;
    });
  }, [records, search, filterType]);

  const stats = useMemo(() => {
    if (!records) return { total: 0, matchClients: 0, matchSacados: 0, active: 0 };
    return {
      total: records.length,
      matchClients: records.filter((r: any) => r.matched_client_id).length,
      matchSacados: records.filter((r: any) => r.matched_sacado_names?.length > 0).length,
      active: records.filter((r: any) => ["em_andamento", "deferido"].includes(r.status)).length,
    };
  }, [records]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Informe Falimentar</h1>
          <p className="text-muted-foreground text-sm">
            Monitore falências e recuperações judiciais no mercado e cruze com sua carteira.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Registrar Ocorrência</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Ocorrência Falimentar</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Razão Social / Nome *</Label>
                <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Empresa XYZ Ltda" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNPJ/CPF</Label>
                  <Input value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <Label>Tipo *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data do Pedido</Label>
                  <Input type="date" value={form.filing_date} onChange={(e) => setForm({ ...form, filing_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vara/Tribunal</Label>
                  <Input value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })} placeholder="2ª Vara Empresarial - SP" />
                </div>
                <div>
                  <Label>Nº do Processo</Label>
                  <Input value={form.process_number} onChange={(e) => setForm({ ...form, process_number: e.target.value })} placeholder="0000000-00.0000.0.00.0000" />
                </div>
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="diario_oficial">Diário Oficial</SelectItem>
                    <SelectItem value="consulta_publica">Consulta Pública</SelectItem>
                    <SelectItem value="api">API Externa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.company_name || saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Registros Totais</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Em Andamento / Deferidos</div>
          </CardContent>
        </Card>
        <Card className={stats.matchClients > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`text-2xl font-bold ${stats.matchClients > 0 ? "text-destructive" : ""}`}>{stats.matchClients}</div>
            <div className="text-xs text-muted-foreground">Coincidem c/ Cedentes</div>
          </CardContent>
        </Card>
        <Card className={stats.matchSacados > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-4 pb-3 text-center">
            <div className={`text-2xl font-bold ${stats.matchSacados > 0 ? "text-destructive" : ""}`}>{stats.matchSacados}</div>
            <div className="text-xs text-muted-foreground">Coincidem c/ Sacados</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Input placeholder="Buscar por nome, CNPJ ou nº processo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(typeConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vara/Tribunal</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cruzamento</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum registro falimentar encontrado.</TableCell></TableRow>
              ) : (
                filtered.map((item: any) => {
                  const tc = typeConfig[item.type] || typeConfig.falencia;
                  const sc = statusConfig[item.status] || statusConfig.em_andamento;
                  const hasMatch = item.matched_client_id || item.matched_sacado_names?.length > 0;
                  return (
                    <TableRow key={item.id} className={hasMatch ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium text-sm">{item.company_name}</TableCell>
                      <TableCell className="font-mono text-sm">{item.document || "—"}</TableCell>
                      <TableCell><Badge className={tc.color}>{tc.label}</Badge></TableCell>
                      <TableCell><Badge className={sc.color}>{sc.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.court || "—"}</TableCell>
                      <TableCell className="text-sm">{item.filing_date || "—"}</TableCell>
                      <TableCell>
                        {hasMatch ? (
                          <div className="flex flex-col gap-0.5">
                            {item.matched_client_id && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <AlertTriangle className="h-2.5 w-2.5" /> Cedente
                              </Badge>
                            )}
                            {item.matched_sacado_names?.length > 0 && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-destructive text-destructive">
                                <Link2 className="h-2.5 w-2.5" /> Sacado
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
