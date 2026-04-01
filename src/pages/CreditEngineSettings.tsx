import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Save, RotateCcw, Gauge, Weight, Percent, TrendingUp, ShieldAlert, CheckCircle2, Target, Clock } from "lucide-react";
import { useState, useEffect, useMemo } from "react";

interface EngineRule {
  id: string;
  rule_name: string;
  rule_type: string;
  description: string | null;
  parameters: Record<string, any>;
  is_active: boolean;
  priority: number;
}

export default function CreditEngineSettings() {
  const queryClient = useQueryClient();
  const [editedRules, setEditedRules] = useState<Record<string, EngineRule>>({});
  const [dirty, setDirty] = useState(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["credit-engine-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_engine_rules")
        .select("*")
        .order("rule_type")
        .order("priority");
      if (error) throw error;
      return data as EngineRule[];
    },
  });

  useEffect(() => {
    if (rules) {
      const map: Record<string, EngineRule> = {};
      rules.forEach((r) => (map[r.id] = { ...r }));
      setEditedRules(map);
      setDirty(false);
    }
  }, [rules]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.values(editedRules);
      for (const rule of updates) {
        const { error } = await supabase
          .from("credit_engine_rules")
          .update({
            parameters: rule.parameters,
            is_active: rule.is_active,
            description: rule.description,
          })
          .eq("id", rule.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit-engine-rules"] });
      toast({ title: "Motor de crédito atualizado!" });
      setDirty(false);
    },
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
  });

  const updateParam = (ruleId: string, key: string, value: any) => {
    setEditedRules((prev) => ({
      ...prev,
      [ruleId]: {
        ...prev[ruleId],
        parameters: { ...prev[ruleId].parameters, [key]: value },
      },
    }));
    setDirty(true);
  };

  const toggleActive = (ruleId: string) => {
    setEditedRules((prev) => ({
      ...prev,
      [ruleId]: { ...prev[ruleId], is_active: !prev[ruleId].is_active },
    }));
    setDirty(true);
  };

  const rulesByType = useMemo(() => {
    const grouped: Record<string, EngineRule[]> = {};
    Object.values(editedRules).forEach((r) => {
      if (!grouped[r.rule_type]) grouped[r.rule_type] = [];
      grouped[r.rule_type].push(r);
    });
    Object.keys(grouped).forEach((k) => grouped[k].sort((a, b) => a.priority - b.priority));
    return grouped;
  }, [editedRules]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabConfig = [
    { key: "score_range", label: "Faixas de Score", icon: Gauge },
    { key: "weight", label: "Pesos Radar", icon: Weight },
    { key: "limit_factor", label: "Limites", icon: Percent },
    { key: "rate", label: "Taxas", icon: TrendingUp },
    { key: "cutoff", label: "Regras de Corte", icon: ShieldAlert },
    { key: "auto_approve", label: "Auto-Aprovação", icon: CheckCircle2 },
    { key: "concentration", label: "Concentração", icon: Target },
    { key: "deadline", label: "Prazos", icon: Clock },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Motor de Crédito</h1>
          <p className="text-muted-foreground text-sm">
            Configure as regras, pesos e políticas do motor de decisão de crédito.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (rules) {
                const map: Record<string, EngineRule> = {};
                rules.forEach((r) => (map[r.id] = { ...r }));
                setEditedRules(map);
                setDirty(false);
              }
            }}
            disabled={!dirty}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Resetar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar Regras"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="score_range">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabConfig.map((t) => (
            <TabsTrigger key={t.key} value={t.key} className="gap-1.5">
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {rulesByType[t.key] && (
                <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                  {rulesByType[t.key].length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Score Ranges */}
        <TabsContent value="score_range" className="space-y-3">
          <CardDescription>Defina as faixas de score e suas classificações de risco.</CardDescription>
          <div className="grid gap-3">
            {rulesByType.score_range?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <CardContent className="py-4 flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: rule.parameters.color }}
                  />
                  <div className="font-medium w-16">{rule.parameters.grade}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={rule.parameters.min}
                      onChange={(e) => updateParam(rule.id, "min", Number(e.target.value))}
                    />
                    <span className="text-muted-foreground">a</span>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={rule.parameters.max}
                      onChange={(e) => updateParam(rule.id, "max", Number(e.target.value))}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground flex-1">{rule.parameters.risk_label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Weights */}
        <TabsContent value="weight" className="space-y-3">
          <CardDescription>Ajuste os pesos de cada dimensão no radar de risco. A soma ideal é 100.</CardDescription>
          {(() => {
            const totalWeight = rulesByType.weight?.reduce((s, r) => s + (r.parameters.weight || 0), 0) || 0;
            return (
              <Badge variant={Math.abs(totalWeight - 100) < 1 ? "default" : "destructive"}>
                Soma: {totalWeight}%
              </Badge>
            );
          })()}
          <div className="grid gap-3">
            {rulesByType.weight?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <CardContent className="py-4 flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <div className="font-medium flex-1">{rule.description}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={rule.parameters.weight}
                      onChange={(e) => updateParam(rule.id, "weight", Number(e.target.value))}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Limit Factors */}
        <TabsContent value="limit_factor" className="space-y-3">
          <CardDescription>% do faturamento médio que será sugerido como limite, por faixa de score.</CardDescription>
          <div className="grid gap-3">
            {rulesByType.limit_factor?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <CardContent className="py-4 flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <div className="font-medium flex-1">{rule.description}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Score ≥</span>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={rule.parameters.min_score}
                      onChange={(e) => updateParam(rule.id, "min_score", Number(e.target.value))}
                    />
                    <span className="text-sm text-muted-foreground">→</span>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={rule.parameters.factor_percent}
                      onChange={(e) => updateParam(rule.id, "factor_percent", Number(e.target.value))}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Rates */}
        <TabsContent value="rate" className="space-y-3">
          <CardDescription>Taxa base mensal por faixa de score + ajustes por prazo.</CardDescription>
          <div className="grid gap-3">
            {rulesByType.rate?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center gap-4">
                    <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                    <div className="font-medium flex-1">{rule.description}</div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 pl-12">
                    <div>
                      <label className="text-xs text-muted-foreground">Taxa Base (%)</label>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8"
                        value={rule.parameters.base_rate}
                        onChange={(e) => updateParam(rule.id, "base_rate", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">+Prazo 30d</label>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8"
                        value={rule.parameters.prazo_adjustment_30}
                        onChange={(e) => updateParam(rule.id, "prazo_adjustment_30", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">+Prazo 45d</label>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8"
                        value={rule.parameters.prazo_adjustment_45}
                        onChange={(e) => updateParam(rule.id, "prazo_adjustment_45", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">+Prazo 60d</label>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8"
                        value={rule.parameters.prazo_adjustment_60}
                        onChange={(e) => updateParam(rule.id, "prazo_adjustment_60", Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">+Prazo 90d</label>
                      <Input
                        type="number"
                        step="0.1"
                        className="h-8"
                        value={rule.parameters.prazo_adjustment_90}
                        onChange={(e) => updateParam(rule.id, "prazo_adjustment_90", Number(e.target.value))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cutoff Rules */}
        <TabsContent value="cutoff" className="space-y-3">
          <CardDescription>Regras de corte automático — quando acionadas, rejeitam ou alertam.</CardDescription>
          <div className="grid gap-3">
            {rulesByType.cutoff?.map((rule) => (
              <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
                <CardContent className="py-4 flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <Badge variant={rule.parameters.action === "reject" ? "destructive" : "outline"}>
                    {rule.parameters.action === "reject" ? "Rejeição" : "Alerta"}
                  </Badge>
                  <div className="flex-1">
                    <div className="font-medium">{rule.rule_name}</div>
                    <div className="text-sm text-muted-foreground">{rule.parameters.message}</div>
                  </div>
                  {rule.parameters.value !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Valor:</span>
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={rule.parameters.value}
                        onChange={(e) => updateParam(rule.id, "value", Number(e.target.value))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Auto Approve */}
        <TabsContent value="auto_approve" className="space-y-3">
          <CardDescription>Critérios para aprovação automática sem passar pelo comitê.</CardDescription>
          {rulesByType.auto_approve?.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <div className="font-medium">{rule.rule_name}</div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pl-12">
                  <div>
                    <label className="text-xs text-muted-foreground">Score Mínimo</label>
                    <Input type="number" className="h-8" value={rule.parameters.min_score}
                      onChange={(e) => updateParam(rule.id, "min_score", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Conc. Máx. (%)</label>
                    <Input type="number" className="h-8" value={rule.parameters.max_concentration}
                      onChange={(e) => updateParam(rule.id, "max_concentration", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Anos Mínimos</label>
                    <Input type="number" className="h-8" value={rule.parameters.min_years}
                      onChange={(e) => updateParam(rule.id, "min_years", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sacados Mín.</label>
                    <Input type="number" className="h-8" value={rule.parameters.min_sacados}
                      onChange={(e) => updateParam(rule.id, "min_sacados", Number(e.target.value))} />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="text-xs text-muted-foreground">Sem Restritivos</label>
                    <Switch checked={rule.parameters.requires_nada_consta}
                      onCheckedChange={(v) => updateParam(rule.id, "requires_nada_consta", v)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Concentration */}
        <TabsContent value="concentration" className="space-y-3">
          <CardDescription>Limites de concentração de sacados.</CardDescription>
          {rulesByType.concentration?.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="py-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                  <div className="font-medium">{rule.rule_name}</div>
                </div>
                <div className="grid grid-cols-3 gap-4 pl-12">
                  <div>
                    <label className="text-xs text-muted-foreground">% Máx. por Sacado</label>
                    <Input type="number" className="h-8" value={rule.parameters.max_single_percent}
                      onChange={(e) => updateParam(rule.id, "max_single_percent", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">HHI Máximo</label>
                    <Input type="number" className="h-8" value={rule.parameters.max_hhi}
                      onChange={(e) => updateParam(rule.id, "max_hhi", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Sacados Mínimos</label>
                    <Input type="number" className="h-8" value={rule.parameters.min_sacados}
                      onChange={(e) => updateParam(rule.id, "min_sacados", Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Deadlines */}
        <TabsContent value="deadline" className="space-y-3">
          <CardDescription>Prazos máximos e ideais para títulos.</CardDescription>
          {rulesByType.deadline?.map((rule) => (
            <Card key={rule.id} className={!rule.is_active ? "opacity-50" : ""}>
              <CardContent className="py-4 flex items-center gap-4">
                <Switch checked={rule.is_active} onCheckedChange={() => toggleActive(rule.id)} />
                <div className="font-medium flex-1">{rule.rule_name}</div>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Prazo Ideal (dias)</label>
                    <Input type="number" className="w-24 h-8" value={rule.parameters.prazo_ideal_dias}
                      onChange={(e) => updateParam(rule.id, "prazo_ideal_dias", Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Prazo Máximo (dias)</label>
                    <Input type="number" className="w-24 h-8" value={rule.parameters.max_prazo_dias}
                      onChange={(e) => updateParam(rule.id, "max_prazo_dias", Number(e.target.value))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
