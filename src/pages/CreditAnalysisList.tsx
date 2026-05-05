import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Briefcase, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate, statusLabels } from "@/lib/formatters";

// Status pill colors mapping to SINK tokens
const statusPills: Record<string, string> = {
  draft: "bg-sink-fog/20 text-sink-ink/60 border border-sink-fog",
  in_analysis: "bg-sink-warn/10 text-sink-warn border border-sink-warn/40",
  in_committee: "bg-sink-mint/10 text-sink-deep border border-sink-mint/40",
  approved: "bg-sink-mint text-sink-deep border border-sink-mint",
  approved_restricted: "bg-sink-mint-soft text-sink-deep border border-sink-mint-2",
  rejected: "bg-sink-danger/10 text-sink-danger border border-sink-danger/40",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sink-pill text-[11px] font-semibold font-mono tracking-wide ${statusPills[status] || "bg-sink-fog/20 text-sink-ink/60 border border-sink-fog"}`}>
      {statusLabels[status] || status}
    </span>
  );
}

export default function CreditAnalysisList() {
  const navigate = useNavigate();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["credit-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Buscar deals vinculados (por credit_analysis_id) para mostrar a coluna pipeline
  const { data: deals = [] } = useQuery({
    queryKey: ["deals-for-analyses-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deals")
        .select("id, value, credit_analysis_id, stage_id, deal_stages(name, color, is_won, is_lost)");
      return data || [];
    },
  });

  const dealsByAnalysis = deals.reduce<Record<string, { count: number; total: number; stages: Set<string>; colors: Set<string> }>>((acc, d: any) => {
    if (!d.credit_analysis_id) return acc;
    if (!acc[d.credit_analysis_id]) acc[d.credit_analysis_id] = { count: 0, total: 0, stages: new Set(), colors: new Set() };
    acc[d.credit_analysis_id].count += 1;
    acc[d.credit_analysis_id].total += d.value || 0;
    if (d.deal_stages?.name) acc[d.credit_analysis_id].stages.add(d.deal_stages.name);
    if (d.deal_stages?.color) acc[d.credit_analysis_id].colors.add(d.deal_stages.color);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-2xl text-sink-ink tracking-tight">Análises de Crédito</h1>
          <p className="font-mono text-xs uppercase tracking-wider text-sink-ink/50 mt-0.5">Dossiês e relatórios de análise</p>
        </div>
        <Button
          onClick={() => navigate("/analises/nova")}
          className="bg-sink-mint text-sink-deep hover:bg-sink-mint-2 rounded-sink-pill font-sans font-semibold shadow-sink-sm transition-all"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Análise
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-sink-paper border border-sink-fog rounded-sink-lg shadow-sink-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-sink-cream border-b border-sink-fog hover:bg-sink-cream">
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Cedente</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Analista</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Limite Sugerido</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Pipeline</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Data</TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider text-sink-ink/50 h-10">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-sink-mint border-t-transparent animate-spin" />
                    <span className="font-mono text-xs text-sink-ink/40">Carregando análises...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-14">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-sink-lg bg-sink-cream flex items-center justify-center">
                      <FileText className="h-6 w-6 text-sink-ink/30" />
                    </div>
                    <div>
                      <p className="font-sans font-semibold text-sink-ink/60 text-sm">Nenhuma análise encontrada</p>
                      <p className="font-mono text-xs text-sink-ink/40 mt-0.5">Crie a primeira análise de crédito</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate("/analises/nova")}
                      className="bg-sink-mint text-sink-deep hover:bg-sink-mint-2 rounded-sink-pill font-sans font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Nova Análise
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((a) => {
                const pipeline = dealsByAnalysis[a.id];
                return (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer border-b border-sink-fog/50 hover:bg-sink-cream transition-colors"
                    onClick={() => navigate(`/analises/${a.id}`)}
                  >
                    <TableCell className="font-sans font-semibold text-sink-ink text-sm py-3.5">
                      {(a.clients as any)?.razao_social || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-sink-ink/70 py-3.5">
                      {a.analista_credito || <span className="text-sink-ink/30">—</span>}
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums text-sink-ink font-semibold py-3.5">
                      {a.limite_sugerido ? formatBRL(a.limite_sugerido) : <span className="text-sink-ink/30 font-normal">—</span>}
                    </TableCell>
                    <TableCell className="py-3.5">
                      {pipeline ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/crm/pipeline"); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sink-md border border-sink-fog bg-sink-cream hover:bg-sink-cream-2 transition-colors"
                        >
                          <Briefcase className="h-3 w-3 text-sink-mint" />
                          <span className="font-mono text-xs font-semibold tabular-nums text-sink-ink">{formatBRL(pipeline.total)}</span>
                          <span className="font-mono text-[10px] text-sink-ink/50">· {pipeline.count}</span>
                        </button>
                      ) : (
                        <span className="font-mono text-xs text-sink-ink/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-sink-ink/60 py-3.5">
                      {formatDate(a.data_analise)}
                    </TableCell>
                    <TableCell className="py-3.5">
                      <StatusPill status={a.status} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
