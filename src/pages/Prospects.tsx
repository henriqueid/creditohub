import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  UserSearch, Search, CheckCircle2, XCircle, Clock, AlertTriangle,
  RefreshCw, Trash2, ArrowRight, Shield, TrendingUp, Calendar, Loader2,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCNPJorCPF, formatDate } from "@/lib/formatters";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";
import { getQualificationValidityDays } from "@/lib/prospect-qualification";

interface Prospect {
  id: string;
  documento: string;
  nome: string | null;
  tipo: string;
  qualification_status: string;
  qualification_score: number | null;
  risk_level: string;
  qualification_data: Record<string, any> | null;
  source: string;
  client_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CFG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  qualified: { label: "Qualificado", icon: CheckCircle2, className: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  not_qualified: { label: "Não Qualificado", icon: XCircle, className: "text-red-700 bg-red-50 border-red-200" },
  pending: { label: "Pendente", icon: Clock, className: "text-amber-700 bg-amber-50 border-amber-200" },
};

const RISK_CFG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixo", className: "text-emerald-600" },
  medium: { label: "Médio", className: "text-amber-600" },
  high: { label: "Alto", className: "text-red-600" },
  unknown: { label: "—", className: "text-muted-foreground" },
};

export default function Prospects() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Prospect[];
    },
  });

  const { data: validityDays } = useQuery({
    queryKey: ["prospect-validity-days"],
    queryFn: getQualificationValidityDays,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect removido");
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (prospect: Prospect) => {
      const tipo = prospect.documento.replace(/\D/g, "").length <= 11 ? "CPF" : "CNPJ";
      const { data: existing } = await supabase
        .from("clients")
        .select("id")
        .eq("cnpj_cpf", prospect.documento.replace(/\D/g, ""))
        .maybeSingle();
      if (existing) {
        await supabase.from("prospects").update({ client_id: existing.id }).eq("id", prospect.id);
        return existing.id;
      }
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          cnpj_cpf: prospect.documento.replace(/\D/g, ""),
          razao_social: prospect.nome || `Cedente ${prospect.documento}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      await supabase.from("prospects").update({ client_id: newClient.id }).eq("id", prospect.id);

      // Auto-criar deal no funil se prospect estiver qualificado
      if (prospect.qualification_status === "qualified") {
        try {
          const { data: firstStage } = await supabase
            .from("deal_stages")
            .select("id")
            .eq("is_active", true)
            .eq("is_won", false)
            .eq("is_lost", false)
            .order("order")
            .limit(1)
            .single();
          if (firstStage) {
            await supabase.from("deals").insert({
              client_id: newClient.id,
              stage_id: firstStage.id,
              title: `Oportunidade — ${prospect.nome || prospect.documento}`,
              notes: `Originado de prospect qualificado (score ${prospect.qualification_score ?? "—"}, risco ${prospect.risk_level}).`,
            });
          }
        } catch (e) {
          console.warn("Falha ao criar deal automático:", e);
        }
      }

      return { clientId: newClient.id, qualified: prospect.qualification_status === "qualified" };
    },
    onSuccess: ({ clientId, qualified }) => {
      qc.invalidateQueries({ queryKey: ["prospects"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success(qualified ? "Cedente criado e oportunidade adicionada ao pipeline!" : "Cedente criado com sucesso!");
      navigate(`/crm/cliente/${clientId}`);
    },
    onError: () => toast.error("Erro ao converter prospect"),
  });

  const filtered = prospects.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.documento.includes(q) || (p.nome || "").toLowerCase().includes(q);
  });

  const stats = {
    total: prospects.length,
    qualified: prospects.filter(p => p.qualification_status === "qualified").length,
    notQualified: prospects.filter(p => p.qualification_status === "not_qualified").length,
    pending: prospects.filter(p => p.qualification_status === "pending").length,
    expired: prospects.filter(p => p.expires_at && new Date(p.expires_at) < new Date()).length,
  };

  function isExpired(p: Prospect) {
    return p.expires_at && new Date(p.expires_at) < new Date();
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Prospects</h1>
          <p className="text-sm text-muted-foreground">
            Leads pré-qualificados automaticamente pelo motor de crédito
            {validityDays && <span> · Validade: {validityDays} dias</span>}
          </p>
        </div>
        <Button onClick={() => navigate("/consulta")} size="sm">
          <UserSearch className="mr-1.5 h-4 w-4" /> Nova Consulta
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KpiCard label="Total" value={stats.total} icon={UserSearch} />
        <KpiCard label="Qualificados" value={stats.qualified} icon={CheckCircle2} accent="emerald" />
        <KpiCard label="Não Qualificados" value={stats.notQualified} icon={XCircle} accent="red" />
        <KpiCard label="Pendentes" value={stats.pending} icon={Clock} accent="amber" />
        <KpiCard label="Expirados" value={stats.expired} icon={AlertTriangle} accent="muted" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por documento ou nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserSearch className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum prospect encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">Consulte um CPF/CNPJ para gerar a qualificação automática</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/consulta")}>
                Consultar CPF/CNPJ
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Consultado em</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, i) => {
                  const cfg = STATUS_CFG[p.qualification_status] || STATUS_CFG.pending;
                  const risk = RISK_CFG[p.risk_level || "unknown"] || RISK_CFG.unknown;
                  const expired = isExpired(p);
                  const StatusIcon = cfg.icon;

                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={`cursor-pointer hover:bg-muted/50 transition-colors ${expired ? "opacity-60" : ""}`}
                      onClick={() => navigate(`/consulta?doc=${p.documento}`)}
                    >
                      <TableCell className="font-mono text-sm">{formatCNPJorCPF(p.documento)}</TableCell>
                      <TableCell className="text-sm">{p.nome || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] gap-1 ${cfg.className}`}>
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                          {expired && " (expirado)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {p.qualification_score != null ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${p.qualification_score}%`,
                                  backgroundColor: p.qualification_score >= 60 ? '#10b981' : p.qualification_score >= 30 ? '#f59e0b' : '#ef4444',
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold">{p.qualification_score}</span>
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${risk.className}`}>{risk.label}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.expires_at ? (
                          <span className={expired ? "text-red-500" : ""}>
                            {formatDate(p.expires_at)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          {p.qualification_status === "qualified" && !p.client_id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-primary"
                                  onClick={() => convertMutation.mutate(p)}
                                  disabled={convertMutation.isPending}
                                >
                                  <Building2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Converter em Cedente</TooltipContent>
                            </Tooltip>
                          )}
                          {p.client_id && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => navigate(`/crm/cliente/${p.client_id}`)}>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver Cedente</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/consulta?doc=${p.documento}`)}>
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Reconsultar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remover</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: React.ElementType; accent?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    muted: "text-muted-foreground",
  };
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/50 bg-card/60">
      <Icon className={`h-4 w-4 ${accent ? colorMap[accent] || "text-primary" : "text-primary"}`} />
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-lg font-bold ${accent ? colorMap[accent] || "" : ""}`}>{value}</p>
      </div>
    </div>
  );
}
