import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";
import { Plus, Building2, Car, Landmark, PiggyBank, Wrench, Package, Trash2, Edit } from "lucide-react";

const tipoConfig: Record<string, { label: string; icon: any }> = {
  imovel: { label: "Imóvel", icon: Building2 },
  veiculo: { label: "Veículo", icon: Car },
  participacao_societaria: { label: "Participação Societária", icon: Landmark },
  aplicacao_financeira: { label: "Aplicação Financeira", icon: PiggyBank },
  equipamento: { label: "Equipamento", icon: Wrench },
  outro: { label: "Outro", icon: Package },
};

interface PatrimonialForm {
  client_id: string;
  tipo: string;
  descricao: string;
  valor_estimado: string;
  proprietario: string;
  documento_proprietario: string;
  matricula_registro: string;
  localizacao: string;
  observacoes: string;
}

const emptyForm: PatrimonialForm = {
  client_id: "",
  tipo: "imovel",
  descricao: "",
  valor_estimado: "",
  proprietario: "",
  documento_proprietario: "",
  matricula_registro: "",
  localizacao: "",
  observacoes: "",
};

export default function PatrimonialReport() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<PatrimonialForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState("all");

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: items, isLoading } = useQuery({
    queryKey: ["patrimonial-info", filterClient],
    queryFn: async () => {
      let q = supabase.from("patrimonial_info").select("*, clients(razao_social)").order("created_at", { ascending: false });
      if (filterClient !== "all") q = q.eq("client_id", filterClient);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: form.client_id,
        tipo: form.tipo,
        descricao: form.descricao,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado) : null,
        proprietario: form.proprietario || null,
        documento_proprietario: form.documento_proprietario || null,
        matricula_registro: form.matricula_registro || null,
        localizacao: form.localizacao || null,
        observacoes: form.observacoes || null,
      };
      if (editingId) {
        const { error } = await supabase.from("patrimonial_info").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patrimonial_info").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Item atualizado!" : "Item adicionado!" });
      queryClient.invalidateQueries({ queryKey: ["patrimonial-info"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("patrimonial_info").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Item removido" });
      queryClient.invalidateQueries({ queryKey: ["patrimonial-info"] });
    },
  });

  const totalPatrimonio = items?.reduce((s: number, i: any) => s + (i.valor_estimado || 0), 0) || 0;

  const openEdit = (item: any) => {
    setForm({
      client_id: item.client_id,
      tipo: item.tipo,
      descricao: item.descricao,
      valor_estimado: item.valor_estimado?.toString() || "",
      proprietario: item.proprietario || "",
      documento_proprietario: item.documento_proprietario || "",
      matricula_registro: item.matricula_registro || "",
      localizacao: item.localizacao || "",
      observacoes: item.observacoes || "",
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Informe Patrimonial</h1>
          <p className="text-muted-foreground text-sm">Registro de bens e patrimônio vinculados aos cedentes.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar cedente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Bem</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Bem Patrimonial</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Cedente *</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {clients?.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Estimado</Label>
                    <Input type="number" value={form.valor_estimado} onChange={(e) => setForm({ ...form, valor_estimado: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <Label>Descrição *</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Apartamento 3Q no Centro..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Proprietário</Label>
                    <Input value={form.proprietario} onChange={(e) => setForm({ ...form, proprietario: e.target.value })} />
                  </div>
                  <div>
                    <Label>CPF/CNPJ Proprietário</Label>
                    <Input value={form.documento_proprietario} onChange={(e) => setForm({ ...form, documento_proprietario: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Matrícula/Registro</Label>
                    <Input value={form.matricula_registro} onChange={(e) => setForm({ ...form, matricula_registro: e.target.value })} />
                  </div>
                  <div>
                    <Label>Localização</Label>
                    <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.client_id || !form.descricao || saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{items?.length || 0}</div>
            <div className="text-xs text-muted-foreground">Bens Registrados</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{formatBRL(totalPatrimonio)}</div>
            <div className="text-xs text-muted-foreground">Patrimônio Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{new Set(items?.map((i: any) => i.client_id)).size}</div>
            <div className="text-xs text-muted-foreground">Cedentes com Bens</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Cedente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Proprietário</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : !items?.length ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum bem registrado.</TableCell></TableRow>
              ) : (
                items.map((item: any) => {
                  const tc = tipoConfig[item.tipo] || tipoConfig.outro;
                  const Icon = tc.icon;
                  return (
                    <TableRow key={item.id}>
                      <TableCell><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{tc.label}</div></TableCell>
                      <TableCell className="text-sm">{item.clients?.razao_social || "—"}</TableCell>
                      <TableCell className="text-sm max-w-48 truncate">{item.descricao}</TableCell>
                      <TableCell className="text-sm">{item.proprietario || "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{item.valor_estimado ? formatBRL(item.valor_estimado) : "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.localizacao || "—"}</TableCell>
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
