import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
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
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma análise encontrada
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((a) => (
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
                  <TableCell>{formatDate(a.data_analise)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
