import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Clock, BarChart3, Search, Filter } from "lucide-react";
import { formatBRL } from "@/lib/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  valid: { label: "Válida", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  invalid: { label: "Inválida", color: "bg-red-100 text-red-800", icon: XCircle },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-800", icon: XCircle },
  not_found: { label: "Não Encontrada", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
};

export default function InvoiceMonitoring() {
  const queryClient = useQueryClient();
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["monitored-invoices", selectedClient],
    queryFn: async () => {
      let q = supabase.from("monitored_invoices").select("*, clients(razao_social, cnpj_cpf)").order("data_emissao", { ascending: false });
      if (selectedClient !== "all") q = q.eq("client_id", selectedClient);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: sacados } = useQuery({
    queryKey: ["all-sacados"],
    queryFn: async () => {
      const { data, error } = await supabase.from("credit_analysis_sacados").select("sacado_nome, credit_analysis_id, credit_analysis(client_id)");
      if (error) throw error;
      return data;
    },
  });

  // XML Upload handler
  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const results: any[] = [];
      for (const file of Array.from(files)) {
        const text = await file.text();
        try {
          const parsed = parseNFXml(text);
          const { error } = await supabase.from("monitored_invoices").insert({
            client_id: selectedClient === "all" ? null : selectedClient,
            ...parsed,
            source: file.name.toLowerCase().endsWith(".xml") ? "xml" : "cnab",
            xml_data: { raw_filename: file.name },
          });
          if (error) throw error;
          results.push({ file: file.name, success: true });
        } catch (e: any) {
          results.push({ file: file.name, success: false, error: e.message });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.success).length;
      const fail = results.filter((r) => !r.success).length;
      toast({ title: `Upload concluído: ${ok} importadas, ${fail} erros` });
      queryClient.invalidateQueries({ queryKey: ["monitored-invoices"] });
    },
  });

  // Simple XML parser for NFe
  function parseNFXml(xml: string) {
    const get = (tag: string) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
      return match ? match[1].trim() : null;
    };
    return {
      chave_acesso: get("chNFe") || get("infNFe")?.match(/Id="NFe(\d+)"/)?.[1] || null,
      numero_nf: get("nNF"),
      serie: get("serie"),
      data_emissao: get("dhEmi")?.substring(0, 10) || get("dEmi"),
      valor: get("vNF") ? parseFloat(get("vNF")!) : null,
      destinatario_cnpj: get("dest")
        ? (xml.match(/<dest>[\s\S]*?<CNPJ>(\d+)<\/CNPJ>/)?.[1] || xml.match(/<dest>[\s\S]*?<CPF>(\d+)<\/CPF>/)?.[1])
        : null,
      destinatario_nome: xml.match(/<dest>[\s\S]*?<xNome>([^<]+)<\/xNome>/)?.[1] || null,
      natureza_operacao: get("natOp"),
      validation_status: "pending" as const,
    };
  }

  // Cross-reference with sacados
  const crossReferenceData = useMemo(() => {
    if (!invoices || !sacados) return [];
    const sacadoNames = new Set(sacados.map((s) => s.sacado_nome?.toLowerCase()));
    return invoices.map((inv: any) => ({
      ...inv,
      matchesSacado: inv.destinatario_nome ? sacadoNames.has(inv.destinatario_nome.toLowerCase()) : false,
    }));
  }, [invoices, sacados]);

  // Volume history chart data
  const volumeHistory = useMemo(() => {
    if (!invoices) return [];
    const byMonth: Record<string, { month: string; total: number; count: number }> = {};
    invoices.forEach((inv: any) => {
      if (!inv.data_emissao) return;
      const month = inv.data_emissao.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { month, total: 0, count: 0 };
      byMonth[month].total += inv.valor || 0;
      byMonth[month].count += 1;
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  // Stats
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, valid: 0, invalid: 0, pending: 0, totalValue: 0 };
    return {
      total: invoices.length,
      valid: invoices.filter((i: any) => i.validation_status === "valid").length,
      invalid: invoices.filter((i: any) => ["invalid", "cancelled", "not_found"].includes(i.validation_status)).length,
      pending: invoices.filter((i: any) => i.validation_status === "pending").length,
      totalValue: invoices.reduce((s: number, i: any) => s + (i.valor || 0), 0),
    };
  }, [invoices]);

  const filtered = useMemo(() => {
    if (!crossReferenceData) return [];
    if (!search) return crossReferenceData;
    const s = search.toLowerCase();
    return crossReferenceData.filter(
      (i: any) =>
        i.numero_nf?.toLowerCase().includes(s) ||
        i.destinatario_nome?.toLowerCase().includes(s) ||
        i.destinatario_cnpj?.includes(s) ||
        i.chave_acesso?.includes(s)
    );
  }, [crossReferenceData, search]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento de Notas Fiscais</h1>
          <p className="text-muted-foreground text-sm">
            Importe NFs via XML/CNAB, valide e cruze com sacados da análise de crédito.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por cedente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cedentes</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = ".xml,.cnab,.rem,.ret,.txt";
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files && files.length > 0) uploadMutation.mutate(files);
              };
              input.click();
            }}
            disabled={uploadMutation.isPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploadMutation.isPending ? "Importando..." : "Importar XML/CNAB"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total NFs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <div className="text-xs text-muted-foreground">Válidas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <div className="text-xs text-muted-foreground">Inválidas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Pendentes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-2xl font-bold">{formatBRL(stats.totalValue)}</div>
            <div className="text-xs text-muted-foreground">Valor Total</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list"><FileText className="h-3.5 w-3.5 mr-1" /> Lista de NFs</TabsTrigger>
          <TabsTrigger value="cross"><Search className="h-3.5 w-3.5 mr-1" /> Cruzamento Sacados</TabsTrigger>
          <TabsTrigger value="volume"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Evolução Volume</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Buscar por NF, destinatário, CNPJ ou chave..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NF</TableHead>
                    <TableHead>Cedente</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Nat. Operação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Origem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma NF encontrada. Importe XMLs para começar.</TableCell></TableRow>
                  ) : (
                    filtered.slice(0, 100).map((inv: any) => {
                      const st = statusConfig[inv.validation_status] || statusConfig.pending;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.numero_nf || "—"}</TableCell>
                          <TableCell className="text-sm">{inv.clients?.razao_social || "—"}</TableCell>
                          <TableCell>
                            <div className="text-sm">{inv.destinatario_nome || "—"}</div>
                            <div className="text-xs text-muted-foreground font-mono">{inv.destinatario_cnpj || ""}</div>
                          </TableCell>
                          <TableCell className="text-sm">{inv.data_emissao || "—"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{inv.valor ? formatBRL(inv.valor) : "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.natureza_operacao || "—"}</TableCell>
                          <TableCell><Badge className={st.color}>{st.label}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{inv.source?.toUpperCase()}</Badge></TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cross" className="space-y-4">
          <CardDescription>NFs cujo destinatário coincide (ou não) com sacados cadastrados nas análises de crédito.</CardDescription>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Match com Sacados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {crossReferenceData.filter((i: any) => i.matchesSacado).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma NF coincide com sacados cadastrados.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {crossReferenceData.filter((i: any) => i.matchesSacado).map((inv: any) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-1">
                        <span>{inv.destinatario_nome}</span>
                        <span className="font-mono">{inv.valor ? formatBRL(inv.valor) : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" /> Sem Match
                </CardTitle>
              </CardHeader>
              <CardContent>
                {crossReferenceData.filter((i: any) => !i.matchesSacado && i.destinatario_nome).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todas as NFs coincidem ou não há dados.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {crossReferenceData.filter((i: any) => !i.matchesSacado && i.destinatario_nome).slice(0, 50).map((inv: any) => (
                      <div key={inv.id} className="flex justify-between items-center text-sm border-b pb-1">
                        <span>{inv.destinatario_nome}</span>
                        <span className="font-mono">{inv.valor ? formatBRL(inv.valor) : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <CardDescription>Evolução mensal do volume de NFs importadas e valores.</CardDescription>
          {volumeHistory.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                Importe NFs para visualizar a evolução do faturamento.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Volume Financeiro (R$)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={volumeHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatBRL(v)} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Quantidade de NFs</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={volumeHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
