import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatCNPJorCPF, ESTADOS_BR } from "@/lib/formatters";
import { ArrowLeft, Rocket } from "lucide-react";

interface ClientFormData {
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia: string;
  data_fundacao: string;
  segmento: string;
  cidade: string;
  estado: string;
}

const initialData: ClientFormData = {
  cnpj_cpf: "",
  razao_social: "",
  nome_fantasia: "",
  data_fundacao: "",
  segmento: "",
  cidade: "",
  estado: "",
};

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "novo";
  const [form, setForm] = useState<ClientFormData>(initialData);
  const [startAnalysis, setStartAnalysis] = useState(false);

  // Pre-fill from consulta page
  const prefill = (location.state as { prefill?: Record<string, string> })?.prefill;

  const { data: client } = useQuery({
    queryKey: ["client", id],
    queryFn: async () => {
      if (!isEditing) return null;
      const { data, error } = await supabase.from("clients").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (client) {
      setForm({
        cnpj_cpf: client.cnpj_cpf,
        razao_social: client.razao_social,
        nome_fantasia: client.nome_fantasia || "",
        data_fundacao: client.data_fundacao || "",
        segmento: client.segmento || "",
        cidade: client.cidade || "",
        estado: client.estado || "",
      });
    } else if (prefill && !isEditing) {
      setForm({
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
      }
    }
  }, [client, prefill, isEditing]);

  const mutation = useMutation({
    mutationFn: async (data: ClientFormData) => {
      const payload = {
        ...data,
        cnpj_cpf: data.cnpj_cpf.replace(/\D/g, ""),
        data_fundacao: data.data_fundacao || null,
      };
      if (isEditing) {
        const { error } = await supabase.from("clients").update(payload).eq("id", id);
        if (error) throw error;
        return id!;
      } else {
        const { data: inserted, error } = await supabase.from("clients").insert(payload).select("id").single();
        if (error) throw error;
        return inserted.id;
      }
    },
    onSuccess: async (clientId: string) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });

      if (startAnalysis && !isEditing) {
        const { data: analysis, error } = await supabase
          .from("credit_analysis")
          .insert({ client_id: clientId })
          .select("id")
          .single();

        if (error) {
          toast({ title: "Cedente cadastrado, mas erro ao criar análise", description: error.message, variant: "destructive" });
          navigate("/cedentes");
          return;
        }

        toast({ title: "Cedente cadastrado! Análise de crédito iniciada." });
        navigate(`/analises/${analysis.id}`);
      } else {
        toast({ title: isEditing ? "Cedente atualizado" : "Cedente cadastrado" });
        navigate("/cedentes");
      }
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razao_social || !form.cnpj_cpf) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    mutation.mutate(form);
  };

  const updateField = (field: keyof ClientFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const hasPrefill = !!prefill?.razao_social;

  return (
    <div className="p-6 max-w-2xl">
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

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Cedente" : "Novo Cedente"}</CardTitle>
          {hasPrefill && !isEditing && (
            <CardDescription>Cadastre o cedente para iniciar a esteira de crédito</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNPJ/CPF *</Label>
                <Input
                  value={formatCNPJorCPF(form.cnpj_cpf)}
                  onChange={(e) => updateField("cnpj_cpf", e.target.value.replace(/\D/g, ""))}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input
                  value={form.razao_social}
                  onChange={(e) => updateField("razao_social", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input
                  value={form.nome_fantasia}
                  onChange={(e) => updateField("nome_fantasia", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Fundação</Label>
                <Input
                  type="date"
                  value={form.data_fundacao}
                  onChange={(e) => updateField("data_fundacao", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Segmento</Label>
                <Input
                  value={form.segmento}
                  onChange={(e) => updateField("segmento", e.target.value)}
                  placeholder="Ex: Indústria, Comércio..."
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={(e) => updateField("cidade", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => updateField("estado", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_BR.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <input
                  type="checkbox"
                  id="start-analysis"
                  checked={startAnalysis}
                  onChange={(e) => setStartAnalysis(e.target.checked)}
                  className="rounded border-border"
                />
                <label htmlFor="start-analysis" className="text-sm cursor-pointer">
                  <span className="font-medium">Iniciar análise de crédito</span>
                  <span className="text-muted-foreground"> — criar rascunho automaticamente após o cadastro</span>
                </label>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending
                  ? "Salvando..."
                  : startAnalysis && !isEditing
                  ? "Cadastrar e Iniciar Análise"
                  : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
