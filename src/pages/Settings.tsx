import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { toast as toastHook } from "@/hooks/use-toast";
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
  Plug,
  Plus,
  Trash2,
  Edit,
  TestTube,
  User,
  Loader2,
  UserSearch,
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

function ProfileTab() {
  const [profile, setProfile] = useState({ full_name: "", cargo: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      setUserId(session.user.id);
      supabase
        .from("profiles")
        .select("full_name, cargo")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setProfile({ full_name: data.full_name || "", cargo: data.cargo || "" });
          setLoading(false);
        });
    });
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, cargo: profile.cargo })
      .eq("user_id", userId);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar perfil");
    } else {
      toast.success("Perfil atualizado!");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" /> Meu Perfil
          </CardTitle>
          <CardDescription>Gerencie suas informações pessoais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome completo</Label>
            <Input
              id="profile-name"
              value={profile.full_name}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-cargo">Cargo / Função</Label>
            <Input
              id="profile-cargo"
              value={profile.cargo}
              onChange={(e) => setProfile((p) => ({ ...p, cargo: e.target.value }))}
              placeholder="Ex: Analista de Crédito"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
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

  const { data: integrationCount = 0 } = useQuery({
    queryKey: ["integration-configs-count"],
    queryFn: async () => {
      const { data } = await supabase.from("integration_configs").select("id, is_active");
      return data || [];
    },
    select: (data) => data,
  });

  const activeIntegrations = Array.isArray(integrationCount) ? integrationCount.filter((i: any) => i.is_active).length : 0;
  const totalIntegrations = Array.isArray(integrationCount) ? integrationCount.length : 0;

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
      {/* Motor de Crédito Banner */}
      <Card className="bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => navigate("/configuracoes/motor")}>
        <CardContent className="py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-semibold">Motor de Crédito</h3>
              <p className="text-sm text-muted-foreground">Configure regras, pesos, faixas de score e políticas de decisão</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Configurar Motor →</Button>
        </CardContent>
      </Card>


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

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-4 w-4" /> Perfil
          </TabsTrigger>
          <TabsTrigger value="general" className="gap-1.5">
            <Building2 className="h-4 w-4" /> Geral
          </TabsTrigger>
          <TabsTrigger value="approval" className="gap-1.5">
            <Shield className="h-4 w-4" /> Aprovação
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5">
            <Zap className="h-4 w-4" /> Automação
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-1.5">
            <Plug className="h-4 w-4" /> Integrações
            {totalIntegrations > 0 && <Badge variant="secondary" className="ml-1 text-xs px-1.5">{totalIntegrations}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-1.5">
            <Users className="h-4 w-4" /> Acessos
          </TabsTrigger>
        </TabsList>

        {/* === PERFIL === */}
        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

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
                <ToggleSetting
                  label="Follow-up automático de oportunidades"
                  description="Cria tarefas automaticamente quando uma oportunidade fica parada no mesmo estágio por X dias"
                  icon={<CalendarClock className="h-4 w-4" />}
                  checked={getSettingBool("auto_followup_enabled")}
                  onChange={(v) => updateSetting("auto_followup_enabled", String(v))}
                />
                <Separator />
                <SettingField
                  label="Dias para follow-up automático"
                  description="Número de dias sem movimentação para criar tarefa de follow-up"
                  icon={<Clock className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={getSetting("followup_stale_days")}
                    onChange={(e) => updateSetting("followup_stale_days", e.target.value)}
                    className="max-w-[120px]"
                    placeholder="7"
                  />
                </SettingField>
                <Separator />
                <SettingField
                  label="Validade da qualificação de prospects (dias)"
                  description="Número de dias que a pré-qualificação automática de um prospect permanece válida antes de expirar"
                  icon={<UserSearch className="h-4 w-4" />}
                >
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={getSetting("prospect_qualification_validity_days")}
                    onChange={(e) => updateSetting("prospect_qualification_validity_days", e.target.value)}
                    className="max-w-[120px]"
                    placeholder="30"
                  />
                </SettingField>
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
        {/* === INTEGRAÇÕES === */}
        <TabsContent value="integrations">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <IntegrationsTab />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- Integrations Tab ---- */

interface IntegrationForm {
  name: string;
  integration_type: string;
  api_url: string;
  auth_type: string;
  auth_secret_name: string;
  notes: string;
  is_active: boolean;
}

const emptyIntegrationForm: IntegrationForm = {
  name: "",
  integration_type: "export_cadastro",
  api_url: "",
  auth_type: "bearer",
  auth_secret_name: "",
  notes: "",
  is_active: false,
};

function IntegrationsTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<IntegrationForm>(emptyIntegrationForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integration-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("integration_configs").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        integration_type: form.integration_type,
        api_url: form.api_url || null,
        auth_type: form.auth_type,
        auth_secret_name: form.auth_secret_name || null,
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (editingId) {
        const { error } = await supabase.from("integration_configs").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("integration_configs").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toastHook({ title: editingId ? "Integração atualizada!" : "Integração criada!" });
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      queryClient.invalidateQueries({ queryKey: ["integration-configs-count"] });
      setDialogOpen(false);
      setForm(emptyIntegrationForm);
      setEditingId(null);
    },
    onError: () => toastHook({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("integration_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toastHook({ title: "Integração removida" });
      queryClient.invalidateQueries({ queryKey: ["integration-configs"] });
      queryClient.invalidateQueries({ queryKey: ["integration-configs-count"] });
    },
  });

  const openEdit = (item: any) => {
    setForm({
      name: item.name,
      integration_type: item.integration_type,
      api_url: item.api_url || "",
      auth_type: item.auth_type || "bearer",
      auth_secret_name: item.auth_secret_name || "",
      notes: item.notes || "",
      is_active: item.is_active,
    });
    setEditingId(item.id);
    setDialogOpen(true);
  };

  const typeLabels: Record<string, string> = {
    export_cadastro: "Exportar Cadastro",
    webhook: "Webhook",
    api_sync: "Sincronização API",
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              Integrações
            </CardTitle>
            <CardDescription>Configure conexões com sistemas externos via API e Webhooks</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyIntegrationForm); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova Integração</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Integração</DialogTitle></DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Nome do Sistema *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Sistema de Operações XYZ" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.integration_type} onValueChange={(v) => setForm({ ...form, integration_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export_cadastro">Exportar Cadastro</SelectItem>
                        <SelectItem value="webhook">Webhook</SelectItem>
                        <SelectItem value="api_sync">Sincronização API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Autenticação</Label>
                    <Select value={form.auth_type} onValueChange={(v) => setForm({ ...form, auth_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bearer">Bearer Token</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="none">Nenhuma</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>URL da API</Label>
                  <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.sistema.com/v1/cadastros" />
                </div>
                <div>
                  <Label>Nome da Secret (token/chave)</Label>
                  <Input value={form.auth_secret_name} onChange={(e) => setForm({ ...form, auth_secret_name: e.target.value })} placeholder="Ex: SISTEMA_XYZ_API_KEY" />
                  <p className="text-xs text-muted-foreground mt-1">Nome da variável de ambiente que contém a credencial.</p>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Ativa</Label>
                </div>
                <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>
                  {saveMutation.isPending ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : !integrations?.length ? (
          <div className="border-dashed border-2 rounded-lg py-12 text-center">
            <Plug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma integração configurada</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Configure integrações para enviar cadastros de cedentes aprovados para seu sistema de operações.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((item: any) => (
              <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Plug className="h-4 w-4" />
                      {item.name}
                    </CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={item.is_active ? "default" : "secondary"}>
                        {item.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline">{typeLabels[item.integration_type] || item.integration_type}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.api_url && (
                    <div className="text-sm text-muted-foreground font-mono truncate">{item.api_url}</div>
                  )}
                  {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <TestTube className="h-3.5 w-3.5 mr-1" /> Testar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive ml-auto" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
