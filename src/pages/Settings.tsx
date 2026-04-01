import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Zap,
  Users,
  Save,
  Building2,
  Target,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Percent,
  DollarSign,
  BarChart3,
  Bot,
  Bell,
  CalendarClock,
} from "lucide-react";

type SettingRow = {
  id: string;
  key: string;
  value: any;
  category: string;
  description: string | null;
  updated_at: string;
};

function parseValue(val: any): string {
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .order("category");
      if (error) throw error;
      return data as SettingRow[];
    },
  });

  useEffect(() => {
    if (settings.length > 0 && Object.keys(localSettings).length === 0) {
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.key] = parseValue(s.value);
      });
      setLocalSettings(map);
    }
  }, [settings]);

  const updateSetting = (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const promises = Object.entries(localSettings).map(([key, value]) => {
        let jsonValue: any;
        if (value === "true" || value === "false") {
          jsonValue = value === "true";
        } else if (!isNaN(Number(value)) && value.trim() !== "") {
          jsonValue = Number(value);
        } else {
          jsonValue = value;
        }
        return supabase
          .from("system_settings")
          .update({ value: jsonValue, updated_at: new Date().toISOString() })
          .eq("key", key);
      });
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      setDirty(false);
      toast.success("Configurações salvas com sucesso!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  const getSetting = (key: string) => localSettings[key] ?? "";
  const getSettingBool = (key: string) => getSetting(key) === "true";
  const getDescription = (key: string) => settings.find((s) => s.key === key)?.description ?? "";

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as regras e políticas do sistema</p>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5">
            <Shield className="h-4 w-4" /> Políticas de Aprovação
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5">
            <Zap className="h-4 w-4" /> Gestão Automática
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5">
            <Users className="h-4 w-4" /> Acessos
          </TabsTrigger>
        </TabsList>

        {/* === GERAL === */}
        <TabsContent value="general">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Dados da Empresa
                </CardTitle>
                <CardDescription>Informações gerais exibidas no sistema e relatórios</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <SettingField
                  label="Nome da Empresa"
                  description={getDescription("company_name")}
                  icon={<Building2 className="h-4 w-4" />}
                >
                  <Input
                    value={getSetting("company_name")}
                    onChange={(e) => updateSetting("company_name", e.target.value)}
                  />
                </SettingField>
                <SettingField
                  label="CNPJ da Empresa"
                  description={getDescription("company_cnpj")}
                  icon={<BarChart3 className="h-4 w-4" />}
                >
                  <Input
                    value={getSetting("company_cnpj")}
                    onChange={(e) => updateSetting("company_cnpj", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </SettingField>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === POLÍTICAS DE APROVAÇÃO === */}
        <TabsContent value="approval">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Committee */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Comitê de Crédito
                </CardTitle>
                <CardDescription>Regras de composição e votação do comitê</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <SettingField
                  label="Membros Mínimos do Comitê"
                  description={getDescription("min_committee_members")}
                  icon={<Users className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={getSetting("min_committee_members")}
                    onChange={(e) => updateSetting("min_committee_members", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
              </CardContent>
            </Card>

            {/* Score thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Thresholds de Score
                </CardTitle>
                <CardDescription>Defina os limites de score para decisões automáticas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <SettingField
                  label="Score Mínimo para Aprovação Automática"
                  description={getDescription("auto_approve_score")}
                  icon={<CheckCircle2 className="h-4 w-4 text-status-approved" />}
                >
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={getSetting("auto_approve_score")}
                    onChange={(e) => updateSetting("auto_approve_score", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
                <SettingField
                  label="Score Máximo para Rejeição Automática"
                  description={getDescription("auto_reject_score")}
                  icon={<XCircle className="h-4 w-4 text-destructive" />}
                >
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    value={getSetting("auto_reject_score")}
                    onChange={(e) => updateSetting("auto_reject_score", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                      <span>0 — {getSetting("auto_reject_score") || "300"}</span>
                      <span className="font-medium">Rejeição</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-status-committee" />
                      <span>{getSetting("auto_reject_score") || "300"} — {getSetting("auto_approve_score") || "800"}</span>
                      <span className="font-medium">Análise Manual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-status-approved" />
                      <span>{getSetting("auto_approve_score") || "800"} — 1000</span>
                      <span className="font-medium">Aprovação</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Limits & Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Limites e Taxas
                </CardTitle>
                <CardDescription>Parâmetros padrão para operações de crédito</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-5">
                <SettingField
                  label="Concentração Máxima (%)"
                  description={getDescription("max_concentration")}
                  icon={<Percent className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={getSetting("max_concentration")}
                    onChange={(e) => updateSetting("max_concentration", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
                <SettingField
                  label="Prazo Máximo (dias)"
                  description={getDescription("max_term_days")}
                  icon={<Clock className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    value={getSetting("max_term_days")}
                    onChange={(e) => updateSetting("max_term_days", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
                <SettingField
                  label="Taxa Padrão Sugerida (%)"
                  description={getDescription("default_rate")}
                  icon={<TrendingUp className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    value={getSetting("default_rate")}
                    onChange={(e) => updateSetting("default_rate", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
                <SettingField
                  label="Limite Mínimo de Operação (R$)"
                  description={getDescription("min_limit_amount")}
                  icon={<DollarSign className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={0}
                    value={getSetting("min_limit_amount")}
                    onChange={(e) => updateSetting("min_limit_amount", e.target.value)}
                    className="max-w-[140px]"
                  />
                </SettingField>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === GESTÃO AUTOMÁTICA === */}
        <TabsContent value="automation">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Automações
                </CardTitle>
                <CardDescription>
                  Configure quais processos o sistema executa automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ToggleSetting
                  label="Verificação automática de Blacklist"
                  description="Verifica automaticamente se o documento está na blacklist ao criar uma análise"
                  icon={<Shield className="h-4 w-4" />}
                  checked={getSettingBool("auto_blacklist_check")}
                  onChange={(v) => updateSetting("auto_blacklist_check", String(v))}
                />
                <Separator />
                <ToggleSetting
                  label="Cálculo automático de Score"
                  description="Calcula o score de crédito automaticamente com base nos dados preenchidos"
                  icon={<BarChart3 className="h-4 w-4" />}
                  checked={getSettingBool("auto_score_calculation")}
                  onChange={(v) => updateSetting("auto_score_calculation", String(v))}
                />
                <Separator />
                <ToggleSetting
                  label="Envio automático ao Comitê"
                  description="Envia automaticamente a análise ao comitê quando todos os campos obrigatórios estiverem preenchidos"
                  icon={<Zap className="h-4 w-4" />}
                  checked={getSettingBool("auto_send_committee")}
                  onChange={(v) => updateSetting("auto_send_committee", String(v))}
                />
                <Separator />
                <ToggleSetting
                  label="Notificar análises pendentes"
                  description="Alerta membros do comitê sobre análises aguardando votação"
                  icon={<Bell className="h-4 w-4" />}
                  checked={getSettingBool("notify_committee_pending")}
                  onChange={(v) => updateSetting("notify_committee_pending", String(v))}
                />
                <Separator />
                <SettingField
                  label="Dias para expirar análise sem movimentação"
                  description={getDescription("days_to_expire_analysis")}
                  icon={<CalendarClock className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    value={getSetting("days_to_expire_analysis")}
                    onChange={(e) => updateSetting("days_to_expire_analysis", e.target.value)}
                    className="max-w-[120px]"
                  />
                </SettingField>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* === ACESSOS === */}
        <TabsContent value="access">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Controle de Acesso
                </CardTitle>
                <CardDescription>
                  Gerencie usuários e permissões do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Autenticação não configurada</h3>
                    <p className="text-sm text-muted-foreground max-w-md mt-1">
                      Para gerenciar acessos e permissões de usuários, é necessário ativar a autenticação do sistema.
                      Com ela, você poderá criar contas de analistas, membros do comitê e administradores com diferentes níveis de acesso.
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center pt-2">
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="h-3 w-3" /> Admin
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <BarChart3 className="h-3 w-3" /> Analista
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> Comitê
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Building2 className="h-3 w-3" /> Comercial
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Solicite a ativação da autenticação para habilitar este recurso.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- Reusable sub-components ---- */

function SettingField({
  label,
  description,
  icon,
  children,
}: {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <Label className="flex items-center gap-2 text-sm font-medium">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  icon,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5 flex-1">
        <Label className="flex items-center gap-2 text-sm font-medium">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
