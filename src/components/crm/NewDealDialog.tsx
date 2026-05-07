import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Building2, UserCheck, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/lib/tokens";
import { fetchExternalConsulta } from "@/lib/external-consulta";
import { cleanDocument, maskCNPJ } from "@/lib/formatters";

type Mode = "new" | "existing";

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  defaultMode?: Mode;
}

export function NewDealDialog({ open, onOpenChange, onCreated, defaultMode = "new" }: NewDealDialogProps) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<"idle" | "found" | "exists" | "not_found">("idle");

  // New-client fields
  const [newClient, setNewClient] = useState({
    cnpj: "", razao_social: "", nome_fantasia: "", segmento: "", cidade: "", estado: "",
  });

  // Existing-client field
  const [existingClientId, setExistingClientId] = useState("");

  // Common deal fields
  const [deal, setDeal] = useState({
    title: "", value: "", monthlyVolume: "", responsible: "", expected_close_date: "", notes: "",
  });

  // Reset on close
  useEffect(() => {
    if (!open) {
      setMode(defaultMode);
      setNewClient({ cnpj: "", razao_social: "", nome_fantasia: "", segmento: "", cidade: "", estado: "" });
      setExistingClientId("");
      setDeal({ title: "", value: "", monthlyVolume: "", responsible: "", expected_close_date: "", notes: "" });
      setLookupStatus("idle");
      setLookingUp(false);
    }
  }, [open, defaultMode]);

  const { data: stages = [] } = useQuery({
    queryKey: ["deal-stages-active"],
    queryFn: async () => {
      const { data } = await supabase.from("deal_stages").select("id, name, order").eq("is_active", true).order("order");
      return data || [];
    },
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list-min"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      return data || [];
    },
  });

  // Auto-lookup CNPJ on blur (only in "new" mode)
  const handleCNPJBlur = async () => {
    const digits = cleanDocument(newClient.cnpj);
    if (digits.length !== 14) return;
    setLookingUp(true);
    setLookupStatus("idle");

    // Check if already exists in our DB
    const { data: existing } = await supabase
      .from("clients").select("id, razao_social").eq("cnpj_cpf", digits).maybeSingle();

    if (existing) {
      setLookupStatus("exists");
      setNewClient(p => ({ ...p, razao_social: existing.razao_social }));
      // Soft suggestion: switch to existing mode
      toast.info("Cedente já cadastrado — alterando para modo existente");
      setMode("existing");
      setExistingClientId(existing.id);
      setLookingUp(false);
      return;
    }

    // Fetch BrasilAPI
    try {
      const sources = await fetchExternalConsulta(digits);
      const brasilApi = sources.find(s => s.source === "BrasilAPI (Receita Federal)" && s.status === "success")?.data;
      if (brasilApi) {
        setLookupStatus("found");
        setNewClient(p => ({
          ...p,
          razao_social: brasilApi.razao_social || p.razao_social,
          nome_fantasia: brasilApi.nome_fantasia || p.nome_fantasia,
          segmento: brasilApi.cnae_descricao || p.segmento,
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

  const createMutation = useMutation({
    mutationFn: async () => {
      let clientId = existingClientId;

      if (mode === "new") {
        const cnpjDigits = cleanDocument(newClient.cnpj);
        if (!cnpjDigits || !newClient.razao_social) throw new Error("CNPJ e razão social são obrigatórios");

        const { data: created, error: clientErr } = await supabase
          .from("clients")
          .insert({
            cnpj_cpf: cnpjDigits,
            razao_social: newClient.razao_social,
            nome_fantasia: newClient.nome_fantasia || null,
            segmento: newClient.segmento || null,
            cidade: newClient.cidade || null,
            estado: newClient.estado || null,
          })
          .select("id")
          .single();
        if (clientErr) throw clientErr;
        clientId = created.id;
      }

      if (!clientId) throw new Error("Cliente não selecionado");

      const dealPayload: Record<string, unknown> = {
        title: deal.title,
        client_id: clientId,
        stage_id: stages[0]?.id,
        value: deal.value ? Number(deal.value) : null,
        monthly_volume: deal.monthlyVolume ? Number(deal.monthlyVolume) : null,
        responsible: deal.responsible || null,
        expected_close_date: deal.expected_close_date || null,
        notes: deal.notes || null,
      };
      let dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
      if (dealRes.error && dealRes.error.message?.includes("monthly_volume")) {
        // Coluna monthly_volume ainda não existe no banco — retry sem ela
        delete dealPayload.monthly_volume;
        dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
      }
      if (dealRes.error) throw dealRes.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      qc.invalidateQueries({ queryKey: ["clients-list"] });
      qc.invalidateQueries({ queryKey: ["clients-list-min"] });
      toast.success("Oportunidade criada!");
      onOpenChange(false);
      onCreated?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar oportunidade");
    },
  });

  const canSubmit =
    deal.title &&
    (mode === "existing"
      ? !!existingClientId
      : cleanDocument(newClient.cnpj).length === 14 && newClient.razao_social.length > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div
          className="grid grid-cols-2 gap-1 p-1 rounded-[10px]"
          style={{ background: T.cinza }}
        >
          <button
            type="button"
            onClick={() => setMode("new")}
            className="flex items-center justify-center gap-2 py-2 rounded-[8px] text-[12.5px] font-medium transition-all"
            style={{
              background: mode === "new" ? T.white : "transparent",
              color: mode === "new" ? T.text : T.textMute,
              boxShadow: mode === "new" ? "var(--shadow-sm)" : "none",
            }}
          >
            <Building2 style={{ width: 14, height: 14 }} />
            Novo cedente
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className="flex items-center justify-center gap-2 py-2 rounded-[8px] text-[12.5px] font-medium transition-all"
            style={{
              background: mode === "existing" ? T.white : "transparent",
              color: mode === "existing" ? T.text : T.textMute,
              boxShadow: mode === "existing" ? "var(--shadow-sm)" : "none",
            }}
          >
            <UserCheck style={{ width: 14, height: 14 }} />
            Cedente existente
          </button>
        </div>

        <div className="space-y-3 pt-1 max-h-[60vh] overflow-y-auto pr-1">
          {/* Client section */}
          {mode === "new" ? (
            <>
              <div>
                <Label>CNPJ</Label>
                <div className="relative">
                  <Input
                    value={newClient.cnpj}
                    onChange={e => {
                      setNewClient(p => ({ ...p, cnpj: maskCNPJ(e.target.value) }));
                      setLookupStatus("idle");
                    }}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    className="font-mono pr-9"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {lookingUp ? (
                      <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: T.textMute }} />
                    ) : (
                      <Search style={{ width: 14, height: 14, color: T.textFaint }} />
                    )}
                  </div>
                </div>
                {lookupStatus === "found" && (
                  <p className="text-[11px] mt-1" style={{ color: T.esmeralda }}>
                    ✓ Dados preenchidos via Receita Federal (BrasilAPI)
                  </p>
                )}
                {lookupStatus === "not_found" && (
                  <p className="text-[11px] mt-1" style={{ color: T.amber }}>
                    CNPJ não encontrado na Receita — preencha manualmente abaixo
                  </p>
                )}
                {lookupStatus === "exists" && (
                  <p className="text-[11px] mt-1" style={{ color: T.textMute }}>
                    Cedente já existe na base — alternado para modo existente
                  </p>
                )}
              </div>
              <div>
                <Label>Razão social *</Label>
                <Input
                  value={newClient.razao_social}
                  onChange={e => setNewClient(p => ({ ...p, razao_social: e.target.value }))}
                  placeholder="Ex: Empresa XYZ Ltda"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nome fantasia</Label>
                  <Input
                    value={newClient.nome_fantasia}
                    onChange={e => setNewClient(p => ({ ...p, nome_fantasia: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Segmento</Label>
                  <Input
                    value={newClient.segmento}
                    onChange={e => setNewClient(p => ({ ...p, segmento: e.target.value }))}
                    placeholder="Ex: Indústria têxtil"
                  />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={newClient.cidade}
                    onChange={e => setNewClient(p => ({ ...p, cidade: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>UF</Label>
                  <Input
                    value={newClient.estado}
                    onChange={e => setNewClient(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                    maxLength={2}
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label>Cedente</Label>
              <Select value={existingClientId} onValueChange={setExistingClientId}>
                <SelectTrigger><SelectValue placeholder="Selecionar cedente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && (
                <p className="text-[11px] mt-1" style={{ color: T.textMute }}>
                  Nenhum cedente cadastrado ainda. Use o modo "Novo cedente".
                </p>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="h-px my-2" style={{ background: T.border }} />

          {/* Deal fields */}
          <div>
            <Label>Título da oportunidade *</Label>
            <Input
              value={deal.title}
              onChange={e => setDeal(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Antecipação de recebíveis"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Limite estimado (R$)</Label>
              <Input
                type="number"
                value={deal.value}
                onChange={e => setDeal(p => ({ ...p, value: e.target.value }))}
                placeholder="Ex: 500000"
              />
              <p style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>
                Cap de crédito que pretende liberar
              </p>
            </div>
            <div>
              <Label>Volume mensal estimado (R$)</Label>
              <Input
                type="number"
                value={deal.monthlyVolume}
                onChange={e => setDeal(p => ({ ...p, monthlyVolume: e.target.value }))}
                placeholder="Ex: 200000"
              />
              <p style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>
                Quanto o cedente vai operar/mês
              </p>
            </div>
          </div>
          <div>
            <Label>Previsão de fechamento</Label>
            <Input
              type="date"
              value={deal.expected_close_date}
              onChange={e => setDeal(p => ({ ...p, expected_close_date: e.target.value }))}
            />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input
              value={deal.responsible}
              onChange={e => setDeal(p => ({ ...p, responsible: e.target.value }))}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={deal.notes}
              onChange={e => setDeal(p => ({ ...p, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <button
            className="w-full flex items-center justify-center gap-2 py-[10px] rounded-[10px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: T.marinho }}
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />}
            Criar oportunidade
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
