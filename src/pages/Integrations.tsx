import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Plug, Trash2, Edit, ExternalLink, TestTube } from "lucide-react";

interface IntegrationForm {
  name: string;
  integration_type: string;
  api_url: string;
  auth_type: string;
  auth_secret_name: string;
  notes: string;
  is_active: boolean;
}

const emptyForm: IntegrationForm = {
  name: "",
  integration_type: "export_cadastro",
  api_url: "",
  auth_type: "bearer",
  auth_secret_name: "",
  notes: "",
  is_active: false,
};

export default function Integrations() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<IntegrationForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_configs").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        integration_type: form.integration_type,
        api_url: form.api_url || null,
        auth_type: form.auth_type,
        auth_secret_name: form.auth_secret_name || null,
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("integration_configs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integration_configs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Integração atualizada!" : "Integração criada!" });
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integration_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Integração removida" });
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
    },
  });

  const openEdit = (item: any) => {
    setForm({
      name: item.name,
      integration_type: item.integration_type,
      api_url: item.api_url || "",
      auth_type: item.auth_type || "bearer",
      auth_secret_name: item.auth_secret_name || "",
      notes: item.notes || "",
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const typeLabels: Record<string, string> = {
    export_cadastro: "Exportar Cadastro",
    webhook: "Webhook",
    api_sync: "Sincronização API",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Integrações</h1>
          <p className="text-muted-foreground text-sm">
            Configure integrações com sistemas terceiros para exportar cadastros e dados.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nova Integração</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Integração</DialogTitle></DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Nome do Sistema *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Sistema de Operações XYZ" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.integration_type} onValueChange={(v) => setForm({ ...form, integration_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="export_cadastro">Exportar Cadastro</SelectItem>
                      <SelectItem value="webhook">Webhook</SelectItem>
                      <SelectItem value="api_sync">Sincronização API</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Autenticação</Label>
                  <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="none">Nenhuma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>URL da API</Label>
                <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.sistema.com/v1/cadastros" />
              </div>
              <div>
                <Label>Nome da Secret (token/chave)</Label>
                <Input value={form.auth_secret_name} onChange={(e) => setForm({ ...form, auth_secret_name: e.target.value })} placeholder="Ex: SISTEMA_XYZ_API_KEY" />
                <p className="text-xs text-muted-foreground mt-1">Nome da variável de ambiente que contém a credencial.</p>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Ativa</Label>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : !integrations?.length ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-16 text-center">
            <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma integração configurada</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure integrações para enviar cadastros de cedentes aprovados para seu sistema de operações.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((item: any) => (
            <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plug className="h-4 w-4" />
                    {item.name}
                  </CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                    <Badge variant="outline">{typeLabels[item.integration_type] || item.integration_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.api_url && (
                  <div className="text-sm text-muted-foreground font-mono truncate">{item.api_url}</div>
                )}
                {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    <TestTube className="h-3.5 w-3.5 mr-1" /> Testar
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => deleteMutation.mutate(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
