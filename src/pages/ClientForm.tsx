import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { formatCNPJorCPF, ESTADOS_BR } from "@/lib/formatters";
import { ArrowLeft } from "lucide-react";

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
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "novo";
  const [form, setForm] = useState<ClientFormData>(initialData);

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
    }
  }, [client]);

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
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: isEditing ? "Cedente atualizado" : "Cedente cadastrado" });
      navigate("/cedentes");
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

  return (
    <div className="p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/cedentes")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Editar Cedente" : "Novo Cedente"}</CardTitle>
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

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/cedentes")}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
