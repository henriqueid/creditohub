import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";

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
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Análises de Crédito</h1>
          <p className="text-muted-foreground">Relatórios de análise de crédito</p>
        </div>
        <Button onClick={() => navigate("/analises/nova")}>
          <Plus className="h-4 w-4 mr-1" /> Nova Análise
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Limite Sugerido</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhuma análise encontrada
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((a) => {
                const pipeline = dealsByAnalysis[a.id];
                return (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/analises/${a.id}`)}
                  >
                    <TableCell className="font-medium">
                      {(a.clients as any)?.razao_social || "—"}
                    </TableCell>
                    <TableCell>{a.analista_credito || "—"}</TableCell>
                    <TableCell className="tabular-nums">{formatBRL(a.limite_sugerido)}</TableCell>
                    <TableCell>
                      {pipeline ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate("/crm/pipeline"); }}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border hover:bg-muted/50 transition-colors"
                        >
                          <Briefcase className="h-3 w-3 text-primary" />
                          <span className="text-xs font-semibold tabular-nums">{formatBRL(pipeline.total)}</span>
                          <span className="text-[10px] text-muted-foreground">· {pipeline.count}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(a.data_analise)}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
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
