import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { formatBRL, formatDate, voteLabels, statusLabels } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Vote, CheckCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type CommitteeVoteType = Database["public"]["Enums"]["committee_vote"];

export default function CommitteeVoting() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("");
  const [vote, setVote] = useState<string>("");
  const [observation, setObservation] = useState("");
  const [totalMembers, setTotalMembers] = useState(3);

  // Result fields
  const [limiteAprovado, setLimiteAprovado] = useState("");
  const [prazoAprovado, setPrazoAprovado] = useState("");
  const [concentracaoMax, setConcentracaoMax] = useState("");
  const [condicoesAdicionais, setCondicoesAdicionais] = useState("");

  const { data: analysis } = useQuery({
    queryKey: ["committee-analysis", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_analysis")
        .select("*, clients(razao_social, cnpj_cpf, segmento, cidade, estado)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: votes = [], refetch: refetchVotes } = useQuery({
    queryKey: ["committee-votes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_committee")
        .select("*")
        .eq("credit_analysis_id", id!)
        .order("vote_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: existingResult } = useQuery({
    queryKey: ["committee-result", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("committee_result")
        .select("*")
        .eq("credit_analysis_id", id!)
        .maybeSingle();
      return data;
    },
  });

  const voteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("credit_committee").insert({
        credit_analysis_id: id!,
        member_name: memberName,
        member_role: memberRole || null,
        vote: vote as CommitteeVoteType,
        observation: observation || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMemberName("");
      setMemberRole("");
      setVote("");
      setObservation("");
      refetchVotes();
      toast({ title: "Voto registrado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  // Calculate majority
  const calculateResult = (): Database["public"]["Enums"]["credit_status"] => {
    const counts = { approve: 0, restrict: 0, reject: 0 };
    votes.forEach((v) => counts[v.vote]++);
    const max = Math.max(counts.approve, counts.restrict, counts.reject);

    if (counts.reject === max) return "rejected";
    if (counts.restrict === max) return "approved_restricted";
    if (counts.approve === max) return "approved";
    // Tie → most conservative
    return "approved_restricted";
  };

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const decision = calculateResult();

      // Create result
      const { error: resultError } = await supabase.from("committee_result").insert({
        credit_analysis_id: id!,
        limite_aprovado: limiteAprovado ? parseFloat(limiteAprovado) : null,
        prazo_aprovado: prazoAprovado ? parseInt(prazoAprovado) : null,
        concentracao_maxima: concentracaoMax ? parseFloat(concentracaoMax) : null,
        condicoes_adicionais: condicoesAdicionais || null,
        decisao_final: decision,
      });
      if (resultError) throw resultError;

      // Update analysis status
      const { error: updateError } = await supabase
        .from("credit_analysis")
        .update({ status: decision })
        .eq("id", id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-queue"] });
      queryClient.invalidateQueries({ queryKey: ["credit-analyses"] });
      toast({ title: "Decisão do comitê finalizada" });
      navigate("/comite");
    },
    onError: (err: Error) => {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
  });

  const allVoted = votes.length >= totalMembers;
  const isFinalized = !!existingResult || (analysis && analysis.status !== "in_committee");

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate("/comite")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Comitê
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Analysis Summary (60%) */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Resumo da Análise
                {analysis && <StatusBadge status={analysis.status} />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis && (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Cliente:</span> <strong>{(analysis.clients as any)?.razao_social}</strong></div>
                    <div><span className="text-muted-foreground">Analista:</span> {analysis.analista_credito || "—"}</div>
                    <div><span className="text-muted-foreground">Data:</span> {formatDate(analysis.data_analise)}</div>
                    <div><span className="text-muted-foreground">Score:</span> {analysis.credit_score ?? "—"}</div>
                    <div><span className="text-muted-foreground">Faturamento:</span> <span className="tabular-nums">{formatBRL(analysis.faturamento_medio)}</span></div>
                    <div><span className="text-muted-foreground">Volume Estimado:</span> <span className="tabular-nums">{formatBRL(analysis.volume_estimado)}</span></div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Limite Sugerido</p>
                      <p className="text-xl font-bold tabular-nums">{formatBRL(analysis.limite_sugerido)}</p>
                    </div>
                    {analysis.riscos && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Riscos</p>
                        <p className="text-sm">{analysis.riscos}</p>
                      </div>
                    )}
                    {analysis.pontos_positivos && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Pontos Positivos</p>
                        <p className="text-sm">{analysis.pontos_positivos}</p>
                      </div>
                    )}
                    {analysis.parecer_analista && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Parecer do Analista</p>
                        <p className="text-sm">{analysis.parecer_analista}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Votes registered */}
          {votes.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Votos Registrados ({votes.length}/{totalMembers})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membro</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Voto</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {votes.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.member_name}</TableCell>
                        <TableCell>{v.member_role || "—"}</TableCell>
                        <TableCell>{voteLabels[v.vote]}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.observation || "—"}</TableCell>
                        <TableCell>{formatDate(v.vote_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Voting Widget (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {!isFinalized && (
            <>
              <Card>
                <CardHeader><CardTitle className="text-lg">Configuração</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Número de membros do comitê</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={totalMembers}
                      onChange={(e) => setTotalMembers(parseInt(e.target.value) || 3)}
                    />
                  </div>
                </CardContent>
              </Card>

              {!allVoted && (
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Vote className="h-5 w-5" /> Registrar Voto</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label>Nome do Membro *</Label>
                      <Input value={memberName} onChange={(e) => setMemberName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cargo</Label>
                      <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Voto *</Label>
                      <Select value={vote} onValueChange={setVote}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">Aprovar</SelectItem>
                          <SelectItem value="restrict">Aprovar com Restrições</SelectItem>
                          <SelectItem value="reject">Reprovar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação</Label>
                      <Textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={3} />
                    </div>
                    <Button
                      onClick={() => voteMutation.mutate()}
                      disabled={!memberName || !vote || voteMutation.isPending}
                      className="w-full"
                    >
                      {voteMutation.isPending ? "Registrando..." : "Registrar Voto"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {allVoted && (
                <Card className="border-status-approved/30">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-status-approved" /> Finalizar Decisão
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Todos os votos foram registrados. Resultado: <strong>{statusLabels[calculateResult()]}</strong>
                    </p>
                    <div className="space-y-2">
                      <Label>Limite Aprovado (R$)</Label>
                      <Input type="number" step="0.01" value={limiteAprovado} onChange={(e) => setLimiteAprovado(e.target.value)} className="tabular-nums" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prazo Aprovado (dias)</Label>
                      <Input type="number" value={prazoAprovado} onChange={(e) => setPrazoAprovado(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Concentração Máxima (%)</Label>
                      <Input type="number" step="0.1" value={concentracaoMax} onChange={(e) => setConcentracaoMax(e.target.value)} className="tabular-nums" />
                    </div>
                    <div className="space-y-2">
                      <Label>Condições Adicionais</Label>
                      <Textarea value={condicoesAdicionais} onChange={(e) => setCondicoesAdicionais(e.target.value)} rows={3} />
                    </div>
                    <Button
                      onClick={() => finalizeMutation.mutate()}
                      disabled={finalizeMutation.isPending}
                      className="w-full"
                    >
                      {finalizeMutation.isPending ? "Finalizando..." : "Finalizar Decisão do Comitê"}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {isFinalized && existingResult && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Resultado do Comitê</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Decisão:</span> <StatusBadge status={existingResult.decisao_final} /></div>
                <div><span className="text-muted-foreground">Limite Aprovado:</span> <span className="tabular-nums font-medium">{formatBRL(existingResult.limite_aprovado)}</span></div>
                <div><span className="text-muted-foreground">Prazo:</span> {existingResult.prazo_aprovado ?? "—"} dias</div>
                <div><span className="text-muted-foreground">Concentração Máxima:</span> {existingResult.concentracao_maxima ?? "—"}%</div>
                {existingResult.condicoes_adicionais && (
                  <div><span className="text-muted-foreground">Condições:</span> {existingResult.condicoes_adicionais}</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
