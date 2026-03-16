import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { formatBRL, formatDate, formatCNPJorCPF } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";

export default function CommitteeQueue() {
  const navigate = useNavigate();

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["committee-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf)")
        .eq("status", "in_committee")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comitê de Crédito</h1>
        <p className="text-muted-foreground">Análises aguardando votação do comitê</p>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Limite Solicitado</TableHead>
              <TableHead>Analista</TableHead>
              <TableHead>Data Envio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : analyses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma análise aguardando votação
                </TableCell>
              </TableRow>
            ) : (
              analyses.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{(a.clients as any)?.razao_social || "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {(a.clients as any)?.cnpj_cpf ? formatCNPJorCPF((a.clients as any).cnpj_cpf) : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatBRL(a.limite_sugerido)}</TableCell>
                  <TableCell>{a.analista_credito || "—"}</TableCell>
                  <TableCell>{formatDate(a.updated_at)}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => navigate(`/comite/${a.id}`)}>
                      Abrir Análise
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
