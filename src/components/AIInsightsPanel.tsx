import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface AIInsightsPanelProps {
  analysisId: string | null;
  insightType: "client" | "market" | "financial" | "risk" | "summary";
  analysisData: any;
  clientData: any;
  existingInsight?: string | null;
  onInsightGenerated?: (content: string) => void;
  className?: string;
}

const typeLabels: Record<string, { label: string; description: string }> = {
  client: { label: "Perfil do Cedente", description: "Análise completa do perfil de crédito do cliente" },
  market: { label: "Análise de Mercado", description: "Insights sobre o setor e contexto econômico" },
  financial: { label: "Análise Financeira", description: "Avaliação dos indicadores financeiros" },
  risk: { label: "Análise de Risco", description: "Classificação de risco com justificativas" },
  summary: { label: "Parecer Executivo", description: "Resumo executivo com recomendação final" },
};

export function AIInsightsPanel({
  analysisId,
  insightType,
  analysisData,
  clientData,
  existingInsight,
  onInsightGenerated,
  className,
}: AIInsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(existingInsight || null);
  const [expanded, setExpanded] = useState(!!existingInsight);

  const typeInfo = typeLabels[insightType] || typeLabels.summary;

  const generateInsight = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { analysisData, clientData, insightType },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erro da IA", description: data.error, variant: "destructive" });
        return;
      }

      const insightContent = data?.content || "Sem insights disponíveis.";
      setContent(insightContent);
      setExpanded(true);

      // Save to DB if analysis exists
      if (analysisId) {
        await supabase.from("credit_analysis_insights").upsert(
          {
            credit_analysis_id: analysisId,
            insight_type: insightType,
            section: insightType,
            content: insightContent,
          },
          { onConflict: "credit_analysis_id,insight_type" }
        ).then(() => {
          // Fallback: if upsert fails due to no unique constraint, just insert
        });

        // If upsert doesn't work (no unique constraint), delete old and insert new
        await supabase
          .from("credit_analysis_insights")
          .delete()
          .eq("credit_analysis_id", analysisId)
          .eq("insight_type", insightType);

        await supabase.from("credit_analysis_insights").insert({
          credit_analysis_id: analysisId,
          insight_type: insightType,
          section: insightType,
          content: insightContent,
        });
      }

      onInsightGenerated?.(insightContent);
      toast({ title: `${typeInfo.label} gerado pela IA` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar insight", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("rounded-xl border overflow-hidden", 
      content ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" : "border-dashed border-muted-foreground/30",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-md", content ? "bg-primary/10" : "bg-muted")}>
            <Sparkles className={cn("h-3.5 w-3.5", content ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-xs font-semibold">{typeInfo.label}</p>
            <p className="text-[10px] text-muted-foreground">{typeInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {content && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={generateInsight}
              disabled={loading}
            >
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
              Regerar
            </Button>
          )}
          {!content && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={generateInsight}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {loading ? "Gerando..." : "Gerar Insight"}
            </Button>
          )}
          {content && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {content && expanded && (
        <div className="px-4 pb-4 border-t border-primary/10">
          <div className="prose prose-sm dark:prose-invert max-w-none pt-3 text-sm leading-relaxed [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_p]:text-xs [&_li]:text-xs [&_strong]:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
