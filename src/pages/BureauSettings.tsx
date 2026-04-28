import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit, TestTube2, ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { consultarBureau } from "@/lib/bureau-client";

const PROVIDER_TYPES = [
  { value: "mock", label: "Mock (Demonstração)" },
  { value: "serasa", label: "Serasa Experian" },
  { value: "boavista", label: "Boa Vista (Equifax)" },
  { value: "spc", label: "SPC Brasil" },
  { value: "quod", label: "Quod" },
  { value: "assertiva", label: "Assertiva" },
  { value: "bigdatacorp", label: "BigDataCorp" },
] as const;

const TIPOS_CONSULTA = [
  { value: "score", label: "Score" },
  { value: "protestos", label: "Protestos" },
  { value: "acoes_judiciais", label: "Ações Judiciais" },
  { value: "restritivos", label: "Restritivos" },
  { value: "pendencias_financeiras", label: "Pendências Financeiras" },
  { value: "consultas_recentes", label: "Consultas Recentes" },
] as const;

interface BureauProvider {
  id: string;
  provider_type: string;
  nome: string;
  credential_secret_name: string | null;
  base_url: string | null;
  ativo: boolean;
  prioridade: number;
  tipos_consulta: string[];
  custo_medio_consulta: number | null;
  observacoes: string | null;
  updated_at: string;
}

export default function BureauSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<BureauProvider> | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testDoc, setTestDoc] = useState("");
  const [testTipo, setTestTipo] = useState<string>("score");
  const [testResult, setTestResult] = useState<unknown>(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["bureau_providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bureau_providers")
        .select("*")
        .order("prioridade", { ascending: true });
      if (error) throw error;
      return data as BureauProvider[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (p: Partial<BureauProvider>) => {
      const payload = {
        provider_type: p.provider_type!,
        nome: p.nome!,
        credential_secret_name: p.credential_secret_name || null,
        base_url: p.base_url || null,
        ativo: p.ativo ?? true,
        prioridade: p.prioridade ?? 100,
        tipos_consulta: p.tipos_consulta ?? ["score"],
        custo_medio_consulta: p.custo_medio_consulta ?? null,
        observacoes: p.observacoes || null,
      };
      if (p.id) {
        const { error } = await supabase.from("bureau_providers").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("bureau_providers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Provider salvo");
      qc.invalidateQueries({ queryKey: ["bureau_providers"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bureau_providers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Provider removido");
      qc.invalidateQueries({ queryKey: ["bureau_providers"] });
    },
  });

  const handleTest = async (provider: BureauProvider) => {
    if (!testDoc) {
      toast.error("Informe um documento para teste");
      return;
    }
    setTestingId(provider.id);
    setTestResult(null);
    try {
      const res = await consultarBureau(testDoc, testTipo as never, {
        provider_id: provider.id,
        force_refresh: true,
      });
      setTestResult(res);
      if (res.status === "sucesso") toast.success(`Conexão OK • ${res.provider_type}`);
      else toast.error(res.error_message ?? "Falha na consulta");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Configurações
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Bureaus de Crédito</h1>
          <p className="text-sm text-muted-foreground">
            Configure os provedores externos de score, protestos e restritivos do seu tenant.
          </p>
        </div>
        <Button onClick={() => setEditing({ ativo: true, prioridade: 100, tipos_consulta: ["score"] })}>
          <Plus className="h-4 w-4 mr-1" /> Novo Provider
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Teste de conexão</CardTitle>
          <CardDescription>
            Insira um documento e selecione o tipo de consulta para testar um provider específico.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input placeholder="CPF ou CNPJ (sem máscara)" value={testDoc} onChange={(e) => setTestDoc(e.target.value)} />
          <Select value={testTipo} onValueChange={setTestTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_CONSULTA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="text-xs text-muted-foreground self-center">
            Use o botão <TestTube2 className="inline h-3 w-3" /> em cada provider abaixo.
          </div>
        </CardContent>
      </Card>

      {testResult ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Resultado do teste</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto max-h-64">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Nenhum bureau configurado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {providers.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <ShieldCheck className={`h-6 w-6 ${p.ativo ? "text-primary" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{p.nome}</span>
                    <Badge variant="outline">{PROVIDER_TYPES.find((t) => t.value === p.provider_type)?.label ?? p.provider_type}</Badge>
                    {!p.ativo && <Badge variant="secondary">Inativo</Badge>}
                    <Badge variant="outline">prioridade {p.prioridade}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-1">
                    {p.tipos_consulta.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-muted text-foreground/70">{t}</span>
                    ))}
                  </div>
                  {p.observacoes ? (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.observacoes}</div>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleTest(p)} disabled={testingId === p.id}>
                    {testingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (confirm(`Remover provider "${p.nome}"?`)) deleteMutation.mutate(p.id);
                  }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar Provider" : "Novo Provider"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={editing?.provider_type}
                onValueChange={(v) => setEditing((p) => ({ ...p, provider_type: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PROVIDER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Apelido / Nome do contrato</Label>
              <Input
                value={editing?.nome ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Ex: Serasa Premium 2026"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prioridade (menor = primeiro)</Label>
                <Input
                  type="number"
                  value={editing?.prioridade ?? 100}
                  onChange={(e) => setEditing((p) => ({ ...p, prioridade: parseInt(e.target.value) || 100 }))}
                />
              </div>
              <div>
                <Label>Custo médio (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editing?.custo_medio_consulta ?? ""}
                  onChange={(e) => setEditing((p) => ({ ...p, custo_medio_consulta: parseFloat(e.target.value) || null }))}
                />
              </div>
            </div>
            <div>
              <Label>Nome do secret (env var)</Label>
              <Input
                value={editing?.credential_secret_name ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, credential_secret_name: e.target.value }))}
                placeholder="Ex: BUREAU_SERASA_TOKEN"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Adicione o secret no backend (Configurações → Secrets). O conteúdo deve ser JSON ({"{"}"client_id","client_secret"{"}"}) ou apenas o token.
              </p>
            </div>
            <div>
              <Label>Base URL (opcional)</Label>
              <Input
                value={editing?.base_url ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, base_url: e.target.value }))}
                placeholder="https://api.fornecedor.com.br"
              />
            </div>
            <div>
              <Label>Tipos de consulta</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TIPOS_CONSULTA.map((t) => {
                  const checked = editing?.tipos_consulta?.includes(t.value) ?? false;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => {
                        const cur = editing?.tipos_consulta ?? [];
                        const next = checked ? cur.filter((x) => x !== t.value) : [...cur, t.value];
                        setEditing((p) => ({ ...p, tipos_consulta: next }));
                      }}
                      className={`text-xs px-2 py-1 rounded border transition ${
                        checked
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={editing?.observacoes ?? ""}
                onChange={(e) => setEditing((p) => ({ ...p, observacoes: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editing?.ativo ?? true}
                onCheckedChange={(c) => setEditing((p) => ({ ...p, ativo: c }))}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              onClick={() => editing && saveMutation.mutate(editing)}
              disabled={!editing?.provider_type || !editing?.nome || saveMutation.isPending}
            >
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
