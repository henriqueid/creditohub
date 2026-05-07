import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/lib/tokens";

const OPERATION_TYPES = [
  "Antecipação de recebíveis",
  "Desconto de duplicatas",
  "Compra de recebíveis",
  "Securitização",
  "FIDC",
  "Outro",
] as const;

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function NewDealDialog({ open, onOpenChange, onCreated }: NewDealDialogProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [clientId, setClientId] = useState("");
  const [deal, setDeal] = useState({
    title: "",
    operation_type: "",
    value: "",
    monthlyVolume: "",
    expected_close_date: "",
    probability: 50,
    responsible: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setClientId("");
      setDeal({ title: "", operation_type: "", value: "", monthlyVolume: "", expected_close_date: "", probability: 50, responsible: "", notes: "" });
    }
  }, [open]);

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

  // Auto-fill title when client selected
  useEffect(() => {
    if (clientId && !deal.title) {
      const c = clients.find((x) => x.id === clientId);
      if (c) setDeal((p) => ({ ...p, title: `Operação ${c.razao_social}` }));
    }
  }, [clientId, clients, deal.title]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Selecione o cedente");
      if (!deal.title) throw new Error("Informe o título");

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
      let dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
      if (dealRes.error && dealRes.error.message?.includes("monthly_volume")) {
        delete dealPayload.monthly_volume;
        dealRes = await supabase.from("deals").insert(dealPayload as { client_id: string; stage_id: string; title: string });
      }
      if (dealRes.error) throw dealRes.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Oportunidade criada!");
      onOpenChange(false);
      onCreated?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || "Erro ao criar oportunidade");
    },
  });

  const probColor = deal.probability >= 70 ? T.esmeralda : deal.probability >= 40 ? T.amber : T.textMute;
  const canSubmit = clientId && deal.title;

  const goToNewClient = () => {
    onOpenChange(false);
    navigate("/cedentes/novo");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Nova oportunidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1 max-h-[65vh] overflow-y-auto pr-1">
          {/* Cedente existente */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cedente *</Label>
              <button
                type="button"
                onClick={goToNewClient}
                className="flex items-center gap-1.5 text-[12px] font-medium hover:underline"
                style={{ color: T.esmeralda }}
              >
                <UserPlus style={{ width: 12, height: 12 }} />
                Cadastrar novo
              </button>
            </div>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Selecionar cedente" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && (
              <p className="text-[11px] mt-1" style={{ color: T.textMute }}>
                Nenhum cedente cadastrado. Use "Cadastrar novo" pra criar cedente + oportunidade juntos.
              </p>
            )}
          </div>

          <div className="h-px my-2" style={{ background: T.border }} />

          {/* Deal fields */}
          <div>
            <Label>Título da oportunidade *</Label>
            <Input
              value={deal.title}
              onChange={(e) => setDeal((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Antecipação de recebíveis"
            />
          </div>
          <div>
            <Label>Tipo de operação</Label>
            <Select value={deal.operation_type} onValueChange={(v) => setDeal((p) => ({ ...p, operation_type: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione a modalidade" /></SelectTrigger>
              <SelectContent>
                {OPERATION_TYPES.map((op) => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Limite estimado (R$)</Label>
              <Input
                type="number"
                value={deal.value}
                onChange={(e) => setDeal((p) => ({ ...p, value: e.target.value }))}
                placeholder="500000"
              />
            </div>
            <div>
              <Label>Volume mensal (R$)</Label>
              <Input
                type="number"
                value={deal.monthlyVolume}
                onChange={(e) => setDeal((p) => ({ ...p, monthlyVolume: e.target.value }))}
                placeholder="200000"
              />
            </div>
          </div>
          <div>
            <Label>Previsão de fechamento</Label>
            <Input
              type="date"
              value={deal.expected_close_date}
              onChange={(e) => setDeal((p) => ({ ...p, expected_close_date: e.target.value }))}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Probabilidade de fechamento</Label>
              <span
                className="tabular-nums"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: probColor,
                }}
              >
                {deal.probability}%
              </span>
            </div>
            <Slider
              value={[deal.probability]}
              min={0} max={100} step={5}
              onValueChange={(v) => setDeal((p) => ({ ...p, probability: v[0] ?? 50 }))}
            />
          </div>
          <div>
            <Label>Responsável</Label>
            <Input
              value={deal.responsible}
              onChange={(e) => setDeal((p) => ({ ...p, responsible: e.target.value }))}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={deal.notes}
              onChange={(e) => setDeal((p) => ({ ...p, notes: e.target.value }))}
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
