import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatCNPJorCPF, ESTADOS_BR, cleanDocument } from "@/lib/formatters";
import { ArrowLeft, Rocket, Loader2, Search } from "lucide-react";
import { ClientTagManager } from "@/components/crm/ClientTagManager";
import { snapshotToCreditAnalysis, insertSnapshotSocios, type ConsultaSnapshot } from "@/lib/consulta-snapshot";
import { fetchExternalConsulta } from "@/lib/external-consulta";
import { T } from "@/lib/tokens";

const OPERATION_TYPES = [
  "Antecipação de recebíveis",
  "Desconto de duplicatas",
  "Compra de recebíveis",
  "Securitização",
  "FIDC",
  "Outro",
] as const;

interface ClientFormData {
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia: string;
  data_fundacao: string;
  segmento: string;
  cidade: string;
  estado: string;
}

interface DealFormData {
  title: string;
  operation_type: string;
  value: string;
  monthlyVolume: string;
  expected_close_date: string;
  probability: number;
  responsible: string;
  notes: string;
}

const initialClient: ClientFormData = {
  cnpj_cpf: "",
  razao_social: "",
  nome_fantasia: "",
  data_fundacao: "",
  segmento: "",
  cidade: "",
  estado: "",
};

const initialDeal: DealFormData = {
  title: "",
  operation_type: "",
  value: "",
  monthlyVolume: "",
  expected_close_date: "",
  probability: 50,
  responsible: "",
  notes: "",
};

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "novo";

  const [client, setClient] = useState<ClientFormData>(initialClient);
  const [deal, setDeal] = useState<DealFormData>(initialDeal);
  const [startAnalysis, setStartAnalysis] = useState(false);
  const [createDeal, setCreateDeal] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "exists" | "not_found">("idle");

  // Pre-fill from consulta page
  const prefill = (location.state as { prefill?: Record<string, string>; snapshot?: ConsultaSnapshot })?.prefill;
  const snapshot = (location.state as { prefill?: Record<string, string>; snapshot?: ConsultaSnapshot })?.snapshot;

  const { data: existing } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!isEditing) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["deal-stages-active"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_stages").select("id, name, order").eq("is_active", true).order("order");
      return data || [];
    },
    enabled: !isEditing,
  });

  useEffect(() => {
    if (existing) {
      setClient({
        cnpj_cpf: existing.cnpj_cpf,
        razao_social: existing.razao_social,
        nome_fantasia: existing.nome_fantasia || "",
        data_fundacao: existing.data_fundacao || "",
        segmento: existing.segmento || "",
        cidade: existing.cidade || "",
        estado: existing.estado || "",
      });
    } else if (prefill && !isEditing) {
      setClient({
        cnpj_cpf: prefill.cnpj_cpf || "",
        razao_social: prefill.razao_social || "",
        nome_fantasia: prefill.nome_fantasia || "",
        data_fundacao: prefill.data_fundacao || "",
        segmento: prefill.segmento || "",
        cidade: prefill.cidade || "",
        estado: prefill.estado || "",
      });
      if (prefill.razao_social) {
        setStartAnalysis(true);
        setDeal((p) => ({ ...p, title: `Operação ${prefill.nome_fantasia || prefill.razao_social}` }));
      }
    }
  }, [existing, prefill, isEditing]);

  // Auto-fill deal title from razao_social
  useEffect(() => {
    if (!isEditing && client.razao_social && !deal.title) {
      setDeal((p) => ({ ...p, title: `Operação ${client.nome_fantasia || client.razao_social}` }));
    }
  }, [client.razao_social, client.nome_fantasia, deal.title, isEditing]);

  // Auto-lookup CNPJ on blur (only when creating)
  const handleCNPJBlur = async () => {
    if (isEditing) return;
    const digits = cleanDocument(client.cnpj_cpf);
    if (digits.length !== 14) return;
    setLookingUp(true);
    setLookupStatus("idle");

    // Already in DB?
    const { data: dup } = await supabase
      .from("clients").select("id, razao_social").eq("cnpj_cpf", digits).maybeSingle();

    if (dup) {
      setLookupStatus("exists");
      toast({
        title: "Cedente já cadastrado",
        description: `${dup.razao_social} — abra o cadastro existente.`,
        variant: "destructive",
      });
      setLookingUp(false);
      return;
    }

    try {
      const sources = await fetchExternalConsulta(digits);
      const brasilApi = sources.find((s) => s.source === "BrasilAPI (Receita Federal)" && s.status === "success")?.data as
        | { razao_social?: string; nome_fantasia?: string; cnae_descricao?: string; data_inicio_atividade?: string; endereco?: { cidade?: string; uf?: string } }
        | undefined;
      if (brasilApi) {
        setLookupStatus("found");
        setClient((p) => ({
          ...p,
          razao_social: brasilApi.razao_social || p.razao_social,
          nome_fantasia: brasilApi.nome_fantasia || p.nome_fantasia,
          segmento: brasilApi.cnae_descricao || p.segmento,
          data_fundacao: brasilApi.data_inicio_atividade || p.data_fundacao,
          cidade: brasilApi.endereco?.cidade || p.cidade,
          estado: brasilApi.endereco?.uf || p.estado,
        }));
      } else {
        setLookupStatus("not_found");
      }
    } catch {
      setLookupStatus("not_found");
    }
    setLookingUp(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const clientPayload = {
        ...client,
        cnpj_cpf: client.cnpj_cpf.replace(/\D/g, ""),
        data_fundacao: client.data_fundacao || null,
      };

      // EDITING flow
      if (isEditing) {
        const { error } = await supabase.from("clients").update(clientPayload).eq("id", id);
        if (error) throw error;
        return { clientId: id!, dealId: null, analysisId: null };
      }

      // CREATE flow
      const { data: createdClient, error: clientErr } = await supabase
        .from("clients").insert(clientPayload).select("id").single();
      if (clientErr) throw clientErr;
      const clientId = createdClient.id;

      // Deal (optional)
      let dealId: string | null = null;
      if (createDeal && deal.title) {
        const dealPayload: Record<string, unknown> = {
          title: deal.title,
          client_id: clientId,
          stage_id: stages[0]?.id,
          operation_type: deal.operation_type || null,
          value: deal.value ? Number(deal.value) : null,
          monthly_volume: deal.monthlyVolume ? Number(deal.monthlyVolume) : null,
          responsible: deal.responsible || null,
          expected_close_date: deal.expected_close_date || null,
          notes: deal.notes || null,
          probability: deal.probability,
        };
        let dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string }).select("id").single();
        if (dealRes.error && dealRes.error.message?.includes("monthly_volume")) {
          delete dealPayload.monthly_volume;
          dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string }).select("id").single();
        }
        if (dealRes.error) {
          // Deal não bloqueia o fluxo principal — só avisa
          toast({ title: "Cedente criado, oportunidade falhou", description: dealRes.error.message, variant: "destructive" });
        } else {
          dealId = dealRes.data?.id ?? null;
        }
      }

      // Analysis (optional)
      let analysisId: string | null = null;
      if (startAnalysis) {
        const analysisPayload: Record<string, unknown> = {
          client_id: clientId,
          modalidade_operacao: deal.operation_type || null,
          limite_sugerido: deal.value ? Number(deal.value) : null,
        };
        if (snapshot) Object.assign(analysisPayload, snapshotToCreditAnalysis(snapshot));
        const { data: analysis, error } = await supabase
          .from("credit_analysis")
          .insert(analysisPayload as { client_id: string } & Record<string, unknown>)
          .select("id").single();
        if (!error && analysis) {
          analysisId = analysis.id;
          if (snapshot) {
            try { await insertSnapshotSocios(analysis.id, snapshot); } catch (e) { console.warn("Falha ao inserir sócios:", e); }
          }
        } else if (error) {
          toast({ title: "Cedente criado, análise falhou", description: error.message, variant: "destructive" });
        }
      }

      return { clientId, dealId, analysisId };
    },
    onSuccess: ({ clientId, dealId, analysisId }) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["deals"] });

      if (isEditing) {
        toast({ title: "Cedente atualizado" });
        navigate("/cedentes");
        return;
      }

      // Smart redirect: análise > deal > lista
      if (analysisId) {
        toast({ title: "Cedente cadastrado e análise iniciada" });
        navigate(`/analises/${analysisId}`);
      } else if (dealId) {
        toast({ title: "Cedente cadastrado e oportunidade criada" });
        navigate("/crm/pipeline");
      } else {
        toast({ title: "Cedente cadastrado" });
        navigate(`/cedentes/${clientId}/perfil`);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.razao_social || !client.cnpj_cpf) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (!isEditing && createDeal && !deal.title) {
      toast({ title: "Informe o título da oportunidade ou desmarque a opção", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const updateClient = (field: keyof ClientFormData, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
    if (field === "cnpj_cpf") setLookupStatus("idle");
  };

  const updateDeal = <K extends keyof DealFormData>(field: K, value: DealFormData[K]) => {
    setDeal((prev) => ({ ...prev, [field]: value }));
  };

  const hasPrefill = !!prefill?.razao_social;
  const probColor = deal.probability >= 70 ? T.esmeralda : deal.probability >= 40 ? T.amber : T.textMute;

  return (
    <div className="p-5 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      {hasPrefill && !isEditing && (
        <Card className="mb-4 border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Rocket className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Dados pré-preenchidos da Receita Federal</p>
              <p className="text-xs text-muted-foreground">Confira e ajuste os dados antes de salvar.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* CADASTRAL */}
        <Card>
          <CardHeader>
            <CardTitle>{isEditing ? "Editar Cedente" : "1. Dados cadastrais"}</CardTitle>
            {!isEditing && (
              <CardDescription>Digite o CNPJ — preenchemos via Receita Federal automaticamente</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ/CPF *</Label>
                <div className="relative">
                  <Input
                    value={formatCNPJorCPF(client.cnpj_cpf)}
                    onChange={(e) => updateClient("cnpj_cpf", e.target.value.replace(/\D/g, ""))}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                    className="font-mono pr-9"
                    disabled={isEditing}
                  />
                  {!isEditing && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {lookingUp
                        ? <Loader2 className="animate-spin h-4 w-4" style={{ color: T.textMute }} />
                        : <Search className="h-4 w-4" style={{ color: T.textFaint }} />}
                    </div>
                  )}
                </div>
                {lookupStatus === "found" && (
                  <p className="text-xs" style={{ color: T.esmeralda }}>✓ Dados preenchidos via Receita Federal</p>
                )}
                {lookupStatus === "not_found" && (
                  <p className="text-xs" style={{ color: T.amber }}>CNPJ não encontrado — preencha manualmente</p>
                )}
                {lookupStatus === "exists" && (
                  <p className="text-xs text-sink-danger">Cedente já existe na base</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={client.razao_social} onChange={(e) => updateClient("razao_social", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={client.nome_fantasia} onChange={(e) => updateClient("nome_fantasia", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data de Fundação</Label>
                <Input type="date" value={client.data_fundacao} onChange={(e) => updateClient("data_fundacao", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Input
                  value={client.segmento}
                  onChange={(e) => updateClient("segmento", e.target.value)}
                  placeholder="Ex: Indústria, Comércio..."
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={client.cidade} onChange={(e) => updateClient("cidade", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={client.estado} onValueChange={(v) => updateClient("estado", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => (<SelectItem key={uf} value={uf}>{uf}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {isEditing && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Tags</Label>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <ClientTagManager clientId={id!} />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OPORTUNIDADE COMERCIAL — só no modo create */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>2. Oportunidade comercial</CardTitle>
                  <CardDescription>Tipo de operação, limite e probabilidade — entra no Pipeline</CardDescription>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={createDeal}
                    onChange={(e) => setCreateDeal(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Criar oportunidade no Pipeline</span>
                </label>
              </div>
            </CardHeader>
            {createDeal && (
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Título da oportunidade *</Label>
                      <Input
                        value={deal.title}
                        onChange={(e) => updateDeal("title", e.target.value)}
                        placeholder="Ex: Antecipação de recebíveis - Empresa XYZ"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de operação</Label>
                      <Select value={deal.operation_type} onValueChange={(v) => updateDeal("operation_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
                        <SelectContent>
                          {OPERATION_TYPES.map((op) => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de fechamento</Label>
                      <Input
                        type="date"
                        value={deal.expected_close_date}
                        onChange={(e) => updateDeal("expected_close_date", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Limite estimado (R$)</Label>
                      <Input
                        type="number"
                        value={deal.value}
                        onChange={(e) => updateDeal("value", e.target.value)}
                        placeholder="500000"
                      />
                      <p className="text-xs text-muted-foreground">Cap de crédito que pretende liberar</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Volume mensal (R$)</Label>
                      <Input
                        type="number"
                        value={deal.monthlyVolume}
                        onChange={(e) => updateDeal("monthlyVolume", e.target.value)}
                        placeholder="200000"
                      />
                      <p className="text-xs text-muted-foreground">Quanto o cedente deve operar/mês</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Probabilidade de fechamento</Label>
                      <span
                        className="tabular-nums font-mono text-xs font-bold"
                        style={{ color: probColor }}
                      >
                        {deal.probability}%
                      </span>
                    </div>
                    <Slider
                      value={[deal.probability]}
                      min={0} max={100} step={5}
                      onValueChange={(v) => updateDeal("probability", v[0] ?? 50)}
                    />
                    <p className="text-xs text-muted-foreground">Confiança comercial em fechar a operação</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <Input
                        value={deal.responsible}
                        onChange={(e) => updateDeal("responsible", e.target.value)}
                        placeholder="Nome do responsável comercial"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={deal.notes}
                      onChange={(e) => updateDeal("notes", e.target.value)}
                      rows={2}
                      placeholder="Detalhes da operação, contexto, próximos passos..."
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* ANÁLISE DE CRÉDITO — só no modo create */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>3. Análise de crédito</CardTitle>
              <CardDescription>Inicia o dossiê automaticamente após o cadastro</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={startAnalysis}
                  onChange={(e) => setStartAnalysis(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">
                  <span className="font-medium">Iniciar análise de crédito</span>
                  <span className="text-muted-foreground"> — cria rascunho automaticamente após o cadastro</span>
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          <Button type="submit" disabled={mutation.isPending || lookupStatus === "exists"}>
            {mutation.isPending
              ? "Salvando..."
              : isEditing
              ? "Salvar"
              : startAnalysis
              ? "Cadastrar e Iniciar Análise"
              : createDeal
              ? "Cadastrar e Criar Oportunidade"
              : "Cadastrar Cedente"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
