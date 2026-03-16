import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate } from "@/lib/formatters";

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let query = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (search) {
        query = query.or(`razao_social.ilike.%${search}%,cnpj_cpf.ilike.%${search}%,nome_fantasia.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cedentes</h1>
          <p className="text-muted-foreground">Cadastro de clientes cedentes</p>
        </div>
        <Button onClick={() => navigate("/cedentes/novo")}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cedente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Razão Social</TableHead>
              <TableHead>CNPJ/CPF</TableHead>
              <TableHead>Segmento</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum cedente encontrado
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/cedentes/${client.id}`)}
                >
                  <TableCell className="font-medium">{client.razao_social}</TableCell>
                  <TableCell className="tabular-nums">{formatCNPJorCPF(client.cnpj_cpf)}</TableCell>
                  <TableCell>{client.segmento || "—"}</TableCell>
                  <TableCell>{client.cidade && client.estado ? `${client.cidade}/${client.estado}` : "—"}</TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
