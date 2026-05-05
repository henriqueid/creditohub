import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";
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
  client: { label: "Perfil do Cedente", description: "Análise do perfil baseada nos dados do dossiê" },
  market: { label: "Análise de Mercado", description: "Contexto de mercado baseado nos dados reais" },
  financial: { label: "Análise Financeira", description: "Indicadores financeiros do dossiê" },
  risk: { label: "Análise de Risco", description: "Riscos identificados nos dados do dossiê" },
  summary: { label: "Parecer Executivo", description: "Parecer baseado exclusivamente no dossiê" },
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
  const [insufficientData, setInsufficientData] = useState<{ missing: string[]; filled: number; total: number } | null>(null);
  const [coverage, setCoverage] = useState<{ percent: number } | null>(null);

  const typeInfo = typeLabels[insightType] || typeLabels.summary;

  const generateInsight = async () => {
    setLoading(true);
    setInsufficientData(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { analysisData, clientData, insightType },
      });

      if (error) throw error;

      // Handle insufficient data response
      if (data?.insufficient_data) {
        setInsufficientData({
          missing: data.missing_fields,
          filled: data.filled_count,
          total: data.total_possible,
        });
        toast({
          title: "Dados insuficientes",
          description: data.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({ title: "Erro da IA", description: data.error, variant: "destructive" });
        return;
      }

      const insightContent = data?.content || "Sem insights disponíveis.";
      setContent(insightContent);
      setExpanded(true);
      if (data?.coverage) setCoverage(data.coverage);

      // Save to DB
      if (analysisId) {
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
      toast({ title: `${typeInfo.label} gerado com base no dossiê` });
    } catch (err: any) {
      toast({ title: "Erro ao gerar insight", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(
      "rounded-sink-lg border overflow-hidden border-l-[3px] transition-all",
      content
        ? "border-sink-fog border-l-sink-mint bg-sink-mint/5"
        : insufficientData
        ? "border-sink-danger/30 border-l-sink-danger bg-sink-danger/5"
        : "border-dashed border-sink-fog border-l-sink-fog bg-sink-paper",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "p-1.5 rounded-sink-sm",
            content ? "bg-sink-mint/10" : insufficientData ? "bg-sink-danger/10" : "bg-sink-cream"
          )}>
            {insufficientData ? (
              <AlertTriangle className="h-3.5 w-3.5 text-sink-danger" />
            ) : (
              <Sparkles className={cn("h-3.5 w-3.5", content ? "text-sink-mint" : "text-sink-ink/40")} />
            )}
          </div>
          <div>
            <p className="font-sans text-xs font-semibold text-sink-ink">{typeInfo.label}</p>
            <p className="font-mono text-[10px] text-sink-ink/40">{typeInfo.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {coverage && content && (
            <span className="font-mono text-[10px] text-sink-ink/50 bg-sink-cream px-2 py-0.5 rounded-sink-pill border border-sink-fog">
              Dossiê {coverage.percent}%
            </span>
          )}
          {content && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 font-mono text-[10px] gap-1 rounded-sink-md border border-sink-fog bg-transparent text-sink-ink/60 hover:bg-sink-cream"
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
              variant={insufficientData ? "outline" : "default"}
              size="sm"
              className={cn(
                "h-7 font-mono text-[10px] gap-1 rounded-sink-md",
                insufficientData
                  ? "border-sink-fog bg-transparent text-sink-ink/60 hover:bg-sink-cream"
                  : "bg-sink-mint text-sink-deep hover:bg-sink-mint-2 border-0"
              )}
              onClick={generateInsight}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              {loading ? "Analisando dossiê..." : "Gerar Insight"}
            </Button>
          )}
          {content && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-sink-sm hover:bg-sink-cream text-sink-ink/40"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {/* Insufficient data warning */}
      {insufficientData && !content && (
        <div className="px-4 pb-4 border-t border-sink-danger/10">
          <div className="pt-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-sink-danger mt-0.5 shrink-0" />
              <div>
                <p className="font-sans text-xs font-semibold text-sink-danger">Dados insuficientes no dossiê</p>
                <p className="font-mono text-[10px] text-sink-ink/50 mt-1">
                  Preencha os seguintes campos obrigatórios antes de gerar esta análise:
                </p>
                <ul className="mt-1.5 space-y-1">
                  {insufficientData.missing.map((field, i) => (
                    <li key={i} className="font-mono text-[10px] text-sink-danger/70 flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-sink-danger/50" />
                      {field}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center gap-1.5">
                  <Info className="h-3 w-3 text-sink-ink/40" />
                  <span className="font-mono text-[10px] text-sink-ink/40">
                    Dossiê preenchido: {insufficientData.filled}/{insufficientData.total} campos
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {content && expanded && (
        <div className="px-4 pb-4 border-t border-sink-mint/20">
          <div className="prose prose-sm dark:prose-invert max-w-none pt-3 text-sm leading-relaxed [&_h1]:text-base [&_h2]:font-sans [&_h2]:text-sm [&_h3]:font-sans [&_h3]:text-sm [&_p]:font-sans [&_p]:text-xs [&_p]:text-sink-ink [&_li]:font-sans [&_li]:text-xs [&_strong]:font-semibold [&_strong]:text-sink-ink">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
