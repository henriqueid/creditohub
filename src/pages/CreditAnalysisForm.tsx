import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/formatters";
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

interface SacadoRow {
  id?: string;
  sacado_nome: string;
  percentual_faturamento: number | null;
  prazo_medio: number | null;
}

interface SocioRow {
  id?: string;
  nome: string;
  cpf: string;
  participacao: number | null;
  cargo: string;
}

export default function CreditAnalysisForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "nova";

  // Form state
  const [clientId, setClientId] = useState("");
  const [responsavelComercial, setResponsavelComercial] = useState("");
  const [analistaCredito, setAnalistaCredito] = useState("");
  const [dataAnalise, setDataAnalise] = useState(new Date().toISOString().split("T")[0]);
  const [faturamentoMedio, setFaturamentoMedio] = useState("");
  const [volumeEstimado, setVolumeEstimado] = useState("");
  const [prazoMedioTitulos, setPrazoMedioTitulos] = useState("");
  const [historicoSocios, setHistoricoSocios] = useState("");
  const [creditScore, setCreditScore] = useState("");
  const [protestos, setProtestos] = useState("");
  const [pendencias, setPendencias] = useState("");
  const [chequesSemFundo, setChequesSemFundo] = useState("");
  const [acoesJudiciais, setAcoesJudiciais] = useState("");
  const [observacoesCredito, setObservacoesCredito] = useState("");
  const [analiseFaturamento, setAnaliseFaturamento] = useState("");
  const [estruturaFinanceira, setEstruturaFinanceira] = useState("");
  const [endividamento, setEndividamento] = useState("");
  const [dependenciaClientes, setDependenciaClientes] = useState("");
  const [riscos, setRiscos] = useState("");
  const [pontosPositivos, setPontosPositivos] = useState("");
  const [limiteSugerido, setLimiteSugerido] = useState("");
  const [prazoMedioPermitido, setPrazoMedioPermitido] = useState("");
  const [concentracaoMaxima, setConcentracaoMaxima] = useState("");
  const [garantias, setGarantias] = useState("");
  const [parecerAnalista, setParecerAnalista] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [status, setStatus] = useState("draft");

  const [sacados, setSacados] = useState<SacadoRow[]>([]);
  const [socios, setSocios] = useState<SocioRow[]>([]);

  // Load clients for selector
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("id, razao_social, cnpj_cpf").order("razao_social");
      return data || [];
    },
  });

  // Load existing analysis
  const { data: analysis } = useQuery({
    queryKey: ["credit-analysis", id],
    queryFn: async () => {
      if (!isEditing) return null;
      const { data, error } = await supabase.from("credit_analysis").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const { data: existingSacados = [] } = useQuery({
    queryKey: ["sacados", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_sacados").select("*").eq("credit_analysis_id", id);
      return data || [];
    },
    enabled: isEditing,
  });

  const { data: existingSocios = [] } = useQuery({
    queryKey: ["socios", id],
    queryFn: async () => {
      if (!isEditing) return [];
      const { data } = await supabase.from("credit_analysis_socios").select("*").eq("credit_analysis_id", id);
      return data || [];
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (analysis) {
      setClientId(analysis.client_id);
      setResponsavelComercial(analysis.responsavel_comercial || "");
      setAnalistaCredito(analysis.analista_credito || "");
      setDataAnalise(analysis.data_analise || "");
      setFaturamentoMedio(analysis.faturamento_medio?.toString() || "");
      setVolumeEstimado(analysis.volume_estimado?.toString() || "");
      setPrazoMedioTitulos(analysis.prazo_medio_titulos?.toString() || "");
      setHistoricoSocios(analysis.historico_socios || "");
      setCreditScore(analysis.credit_score?.toString() || "");
      setProtestos(analysis.protestos || "");
      setPendencias(analysis.pendencias || "");
      setChequesSemFundo(analysis.cheques_sem_fundo || "");
      setAcoesJudiciais(analysis.acoes_judiciais || "");
      setObservacoesCredito(analysis.observacoes_credito || "");
      setAnaliseFaturamento(analysis.analise_faturamento || "");
      setEstruturaFinanceira(analysis.estrutura_financeira || "");
      setEndividamento(analysis.endividamento || "");
      setDependenciaClientes(analysis.dependencia_clientes || "");
      setRiscos(analysis.riscos || "");
      setPontosPositivos(analysis.pontos_positivos || "");
      setLimiteSugerido(analysis.limite_sugerido?.toString() || "");
      setPrazoMedioPermitido(analysis.prazo_medio_permitido?.toString() || "");
      setConcentracaoMaxima(analysis.concentracao_maxima?.toString() || "");
      setGarantias(analysis.garantias || "");
      setParecerAnalista(analysis.parecer_analista || "");
      setRecommendation(analysis.recommendation || "");
      setStatus(analysis.status);
    }
  }, [analysis]);

  useEffect(() => {
    if (existingSacados.length) {
      setSacados(existingSacados.map((s) => ({
        id: s.id,
        sacado_nome: s.sacado_nome,
        percentual_faturamento: s.percentual_faturamento,
        prazo_medio: s.prazo_medio,
      })));
    }
  }, [existingSacados]);

  useEffect(() => {
    if (existingSocios.length) {
      setSocios(existingSocios.map((s) => ({
        id: s.id,
        nome: s.nome,
        cpf: s.cpf || "",
        participacao: s.participacao,
        cargo: s.cargo || "",
      })));
    }
  }, [existingSocios]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        client_id: clientId,
        responsavel_comercial: responsavelComercial || null,
        analista_credito: analistaCredito || null,
        data_analise: dataAnalise || null,
        faturamento_medio: faturamentoMedio ? parseFloat(faturamentoMedio) : null,
        volume_estimado: volumeEstimado ? parseFloat(volumeEstimado) : null,
        prazo_medio_titulos: prazoMedioTitulos ? parseInt(prazoMedioTitulos) : null,
        historico_socios: historicoSocios || null,
        credit_score: creditScore ? parseInt(creditScore) : null,
        protestos: protestos || null,
        pendencias: pendencias || null,
        cheques_sem_fundo: chequesSemFundo || null,
        acoes_judiciais: acoesJudiciais || null,
        observacoes_credito: observacoesCredito || null,
        analise_faturamento: analiseFaturamento || null,
        estrutura_financeira: estruturaFinanceira || null,
        endividamento: endividamento || null,
        dependencia_clientes: dependenciaClientes || null,
        riscos: riscos || null,
        pontos_positivos: pontosPositivos || null,
        limite_sugerido: limiteSugerido ? parseFloat(limiteSugerido) : null,
        prazo_medio_permitido: prazoMedioPermitido ? parseInt(prazoMedioPermitido) : null,
        concentracao_maxima: concentracaoMaxima ? parseFloat(concentracaoMaxima) : null,
        garantias: garantias || null,
        parecer_analista: parecerAnalista || null,
        recommendation: (recommendation || null) as any,
        status: status as any,
      };

      let analysisId = id;

      if (isEditing) {
        const { error } = await supabase.from("credit_analysis").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("credit_analysis").insert(payload).select("id").single();
        if (error) throw error;
        analysisId = data.id;
      }

      // Save sacados
      if (isEditing) {
        await supabase.from("credit_analysis_sacados").delete().eq("credit_analysis_id", analysisId!);
      }
      if (sacados.length > 0) {
        const sacadoInserts = sacados.map((s) => ({
          credit_analysis_id: analysisId!,
          sacado_nome: s.sacado_nome,
          percentual_faturamento: s.percentual_faturamento,
          prazo_medio: s.prazo_medio,
        }));
        await supabase.from("credit_analysis_sacados").insert(sacadoInserts);
      }

      // Save socios
      if (isEditing) {
        await supabase.from("credit_analysis_socios").delete().eq("credit_analysis_id", analysisId!);
      }
      if (socios.length > 0) {
        const socioInserts = socios.map((s) => ({
          credit_analysis_id: analysisId!,
          nome: s.nome,
          cpf: s.cpf || null,
          participacao: s.participacao,
          cargo: s.cargo || null,
        }));
        await supabase.from("credit_analysis_socios").insert(socioInserts);
      }

      return analysisId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      toast({ title: "Análise salva com sucesso" });
      navigate("/analises");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const sendToCommittee = useMutation({
    mutationFn: async () => {
      if (!isEditing) throw new Error("Salve a análise antes de enviar ao comitê");
      const { error } = await supabase
        .from("credit_analysis")
        .update({ status: "in_committee" as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      toast({ title: "Análise enviada ao Comitê de Crédito" });
      navigate("/comite");
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast({ title: "Selecione um cedente", variant: "destructive" });
      return;
    }
    saveMutation.mutate();
  };

  const isReadOnly = status !== "draft";

  const addSacado = () => setSacados([...sacados, { sacado_nome: "", percentual_faturamento: null, prazo_medio: null }]);
  const removeSacado = (i: number) => setSacados(sacados.filter((_, idx) => idx !== i));

  const addSocio = () => setSocios([...socios, { nome: "", cpf: "", participacao: null, cargo: "" }]);
  const removeSocio = (i: number) => setSocios(socios.filter((_, idx) => idx !== i));

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/analises")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        {isEditing && <StatusBadge status={status} />}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Identificação */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Identificação do Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cedente *</Label>
                <Select value={clientId} onValueChange={setClientId} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cedente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data da Análise</Label>
                <Input type="date" value={dataAnalise} onChange={(e) => setDataAnalise(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Responsável Comercial</Label>
                <Input value={responsavelComercial} onChange={(e) => setResponsavelComercial(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Analista de Crédito</Label>
                <Input value={analistaCredito} onChange={(e) => setAnalistaCredito(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Operacional */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Informações Operacionais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Faturamento Médio Mensal (R$)</Label>
                <Input type="number" step="0.01" value={faturamentoMedio} onChange={(e) => setFaturamentoMedio(e.target.value)} disabled={isReadOnly} className="tabular-nums" />
              </div>
              <div className="space-y-2">
                <Label>Volume Estimado (R$)</Label>
                <Input type="number" step="0.01" value={volumeEstimado} onChange={(e) => setVolumeEstimado(e.target.value)} disabled={isReadOnly} className="tabular-nums" />
              </div>
              <div className="space-y-2">
                <Label>Prazo Médio (dias)</Label>
                <Input type="number" value={prazoMedioTitulos} onChange={(e) => setPrazoMedioTitulos(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>

            {/* Sacados table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Principais Sacados</Label>
                {!isReadOnly && (
                  <Button type="button" variant="outline" size="sm" onClick={addSacado}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar
                  </Button>
                )}
              </div>
              {sacados.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sacado</TableHead>
                      <TableHead>% Faturamento</TableHead>
                      <TableHead>Prazo Médio</TableHead>
                      {!isReadOnly && <TableHead className="w-10" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sacados.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={s.sacado_nome} onChange={(e) => {
                            const updated = [...sacados];
                            updated[i].sacado_nome = e.target.value;
                            setSacados(updated);
                          }} disabled={isReadOnly} />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.1" value={s.percentual_faturamento ?? ""} onChange={(e) => {
                            const updated = [...sacados];
                            updated[i].percentual_faturamento = e.target.value ? parseFloat(e.target.value) : null;
                            setSacados(updated);
                          }} disabled={isReadOnly} className="tabular-nums" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" value={s.prazo_medio ?? ""} onChange={(e) => {
                            const updated = [...sacados];
                            updated[i].prazo_medio = e.target.value ? parseInt(e.target.value) : null;
                            setSacados(updated);
                          }} disabled={isReadOnly} />
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSacado(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Estrutura Societária */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Estrutura Societária</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Sócios</Label>
              {!isReadOnly && (
                <Button type="button" variant="outline" size="sm" onClick={addSocio}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              )}
            </div>
            {socios.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Participação %</TableHead>
                    <TableHead>Cargo</TableHead>
                    {!isReadOnly && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {socios.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Input value={s.nome} onChange={(e) => {
                          const u = [...socios]; u[i].nome = e.target.value; setSocios(u);
                        }} disabled={isReadOnly} />
                      </TableCell>
                      <TableCell>
                        <Input value={s.cpf} onChange={(e) => {
                          const u = [...socios]; u[i].cpf = e.target.value; setSocios(u);
                        }} disabled={isReadOnly} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.1" value={s.participacao ?? ""} onChange={(e) => {
                          const u = [...socios]; u[i].participacao = e.target.value ? parseFloat(e.target.value) : null; setSocios(u);
                        }} disabled={isReadOnly} className="tabular-nums" />
                      </TableCell>
                      <TableCell>
                        <Input value={s.cargo} onChange={(e) => {
                          const u = [...socios]; u[i].cargo = e.target.value; setSocios(u);
                        }} disabled={isReadOnly} />
                      </TableCell>
                      {!isReadOnly && (
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeSocio(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="space-y-2">
              <Label>Histórico Empresarial dos Sócios</Label>
              <Textarea value={historicoSocios} onChange={(e) => setHistoricoSocios(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* 4. Consulta de Crédito */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Consulta de Crédito</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Score de Crédito</Label>
                <Input type="number" value={creditScore} onChange={(e) => setCreditScore(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Protestos</Label>
                <Input value={protestos} onChange={(e) => setProtestos(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Pendências Financeiras</Label>
                <Input value={pendencias} onChange={(e) => setPendencias(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Cheques sem Fundo</Label>
                <Input value={chequesSemFundo} onChange={(e) => setChequesSemFundo(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Ações Judiciais</Label>
                <Input value={acoesJudiciais} onChange={(e) => setAcoesJudiciais(e.target.value)} disabled={isReadOnly} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações da Consulta</Label>
              <Textarea value={observacoesCredito} onChange={(e) => setObservacoesCredito(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* 5. Análise Financeira */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Análise Financeira</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Análise de Faturamento</Label>
              <Textarea value={analiseFaturamento} onChange={(e) => setAnaliseFaturamento(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Estrutura Financeira</Label>
              <Textarea value={estruturaFinanceira} onChange={(e) => setEstruturaFinanceira(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Endividamento Aparente</Label>
              <Textarea value={endividamento} onChange={(e) => setEndividamento(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Dependência de Clientes</Label>
              <Textarea value={dependenciaClientes} onChange={(e) => setDependenciaClientes(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* 6. Riscos e Positivos */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Riscos e Pontos Positivos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Riscos Identificados</Label>
              <Textarea value={riscos} onChange={(e) => setRiscos(e.target.value)} disabled={isReadOnly} rows={4} />
            </div>
            <div className="space-y-2">
              <Label>Pontos Positivos</Label>
              <Textarea value={pontosPositivos} onChange={(e) => setPontosPositivos(e.target.value)} disabled={isReadOnly} rows={4} />
            </div>
          </CardContent>
        </Card>

        {/* 7. Operação Proposta */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Estrutura da Operação Proposta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Limite Sugerido (R$)</Label>
                <Input type="number" step="0.01" value={limiteSugerido} onChange={(e) => setLimiteSugerido(e.target.value)} disabled={isReadOnly} className="tabular-nums" />
              </div>
              <div className="space-y-2">
                <Label>Prazo Médio Permitido (dias)</Label>
                <Input type="number" value={prazoMedioPermitido} onChange={(e) => setPrazoMedioPermitido(e.target.value)} disabled={isReadOnly} />
              </div>
              <div className="space-y-2">
                <Label>Concentração Máxima por Sacado (%)</Label>
                <Input type="number" step="0.1" value={concentracaoMaxima} onChange={(e) => setConcentracaoMaxima(e.target.value)} disabled={isReadOnly} className="tabular-nums" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Garantias</Label>
              <Textarea value={garantias} onChange={(e) => setGarantias(e.target.value)} disabled={isReadOnly} rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* 8. Parecer */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Parecer do Analista</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Parecer</Label>
              <Textarea value={parecerAnalista} onChange={(e) => setParecerAnalista(e.target.value)} disabled={isReadOnly} rows={5} />
            </div>
            <div className="space-y-2">
              <Label>Recomendação</Label>
              <Select value={recommendation} onValueChange={setRecommendation} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a recomendação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Aprovar</SelectItem>
                  <SelectItem value="restrict">Aprovar com Restrições</SelectItem>
                  <SelectItem value="reject">Reprovar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          {!isReadOnly && (
            <>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar Rascunho"}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="default"
                  onClick={() => sendToCommittee.mutate()}
                  disabled={sendToCommittee.isPending || !recommendation}
                  className="bg-status-committee hover:bg-status-committee/90"
                >
                  <Send className="h-4 w-4 mr-1" />
                  {sendToCommittee.isPending ? "Enviando..." : "Enviar para Comitê"}
                </Button>
              )}
            </>
          )}
          <Button type="button" variant="outline" onClick={() => navigate("/analises")}>
            {isReadOnly ? "Voltar" : "Cancelar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
