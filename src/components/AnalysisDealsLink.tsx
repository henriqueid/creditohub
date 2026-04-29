import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";

interface Props {
  analysisId: string;
  clientId: string;
  clientName?: string | null;
  limiteSugerido?: number | null;
  responsavel?: string | null;
}

export function AnalysisDealsLink({ analysisId, clientId, clientName, limiteSugerido, responsavel }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: deals = [] } = useQuery({
    queryKey: ["deals-by-analysis-or-client", analysisId, clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, title, value, stage_id, credit_analysis_id, deal_stages(name, color)")
        .or(`credit_analysis_id.eq.${analysisId},client_id.eq.${clientId}`);
      return data || [];
    },
    enabled: !!analysisId && !!clientId,
  });

  const createDeal = useMutation({
    mutationFn: async () => {
      const { data: firstStage } = await supabase
        .from("deal_stages").select("id")
        .eq("is_active", true).eq("is_won", false).eq("is_lost", false)
        .order("order").limit(1).single();
      if (!firstStage) throw new Error("Nenhuma etapa ativa configurada");
      const { error } = await supabase.from("deals").insert({
        client_id: clientId,
        stage_id: firstStage.id,
        title: `Oportunidade — ${clientName || "cliente"}`,
        value: limiteSugerido || null,
        responsible: responsavel || null,
        credit_analysis_id: analysisId,
        notes: "Criada manualmente a partir da análise de crédito.",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals-by-analysis-or-client"] });
      toast({ title: "Oportunidade criada no pipeline" });
    },
    onError: (e: Error) => toast({ title: "Erro ao criar oportunidade", description: e.message, variant: "destructive" }),
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-muted/50 transition-colors">
          <Briefcase className="h-3.5 w-3.5 text-primary" />
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground leading-none">Pipeline</p>
            <p className="text-xs font-semibold">{deals.length} {deals.length === 1 ? "deal" : "deals"}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold">Oportunidades vinculadas</p>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => createDeal.mutate()} disabled={createDeal.isPending}>
            <Plus className="h-3 w-3 mr-1" /> Criar deal
          </Button>
        </div>
        {deals.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Sem oportunidades. Clique em "Criar deal" para iniciar o follow-up comercial.</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {deals.map((d: any) => (
              <button key={d.id} onClick={() => navigate("/crm/pipeline")} className="w-full text-left p-2 rounded border border-border/50 hover:bg-muted/40 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{d.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {d.deal_stages && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: d.deal_stages.color + "20", color: d.deal_stages.color }}>
                          {d.deal_stages.name}
                        </span>
                      )}
                      {d.value && <span className="text-[10px] tabular-nums font-semibold">{formatBRL(d.value)}</span>}
                    </div>
                  </div>
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
