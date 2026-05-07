import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Building2, Plus, Copy, ArrowLeft, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { T } from "@/lib/tokens";

type TenantPlan = "trial" | "basic" | "pro" | "enterprise";
type TenantTipo = "factoring" | "fidc" | "securitizadora" | "outro";

export default function SuperAdmin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isSuperAdmin, isLoading } = useUserPermissions();

  const [createOpen, setCreateOpen] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [tenantPlan, setTenantPlan] = useState<TenantPlan>("trial");
  const [tenantTipo, setTenantTipo] = useState<TenantTipo>("outro");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const { data: tenants = [], isLoading: loadingTenants } = useQuery({
    queryKey: ["super-admin-tenants"],
    enabled: !!isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, nome, tipo, plano, ativo, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createTenant = useMutation({
    mutationFn: async () => {
      if (!tenantName.trim() || !adminEmail.trim()) throw new Error("Nome e email são obrigatórios");
      const { data, error } = await (supabase as any).rpc("create_tenant_with_admin", {
        p_tenant_name: tenantName.trim(),
        p_admin_email: adminEmail.trim().toLowerCase(),
        p_tenant_plan: tenantPlan,
        p_tenant_tipo: tenantTipo,
      });
      if (error) throw error;
      return data as { ok: boolean; tenant_id: string; invite_token: string; invite_email: string };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["super-admin-tenants"] });
      setGeneratedToken(data.invite_token);
      toast.success("Tenant criado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar tenant"),
  });

  const closeDialog = () => {
    setCreateOpen(false);
    setTenantName("");
    setAdminEmail("");
    setTenantPlan("trial");
    setTenantTipo("outro");
    setGeneratedToken(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-semibold">Área restrita</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Esta página é exclusiva para super-administradores do CreditoHub.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-2 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white"
          style={{ background: T.marinho }}
        >
          Voltar ao painel
        </button>
      </div>
    );
  }

  const generatedLink = generatedToken ? `${window.location.origin}/auth?invite=${generatedToken}` : null;

  return (
    <div className="p-4 sm:p-7 space-y-[14px]">
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline"
        style={{ color: T.textMute }}
      >
        <ArrowLeft style={{ width: 12, height: 12 }} /> Voltar ao painel
      </button>

      <div
        className="rounded-[14px] p-4 flex items-center gap-3"
        style={{ background: `${T.esmeralda}10`, border: `1px solid ${T.esmeralda}30` }}
      >
        <ShieldCheck style={{ width: 24, height: 24, color: T.esmeralda }} />
        <div className="flex-1">
          <h1 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Super-admin CreditoHub</h1>
          <p style={{ fontSize: 12.5, color: T.textMute, marginTop: 2 }}>
            Gerencie os workspaces (tenants) que assinam o SaaS. Cada tenant é uma empresa cliente isolada.
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: T.marinho }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Novo tenant
        </button>
      </div>

      <div className="rounded-[14px]" style={{ background: T.white, border: `1px solid ${T.border}`, boxShadow: "0 1px 3px rgba(10,21,56,0.05)" }}>
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Tenants ({tenants.length})</h2>
        </div>
        {loadingTenants ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
          </div>
        ) : tenants.length === 0 ? (
          <p className="py-10 text-center" style={{ fontSize: 13, color: T.textFaint }}>
            Nenhum tenant cadastrado
          </p>
        ) : (
          <div>
            {tenants.map((t: any, i: number) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 p-4"
                style={{ borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{ width: 36, height: 36, background: `${T.esmeralda}15`, color: T.esmeralda }}
                  >
                    <Building2 style={{ width: 18, height: 18 }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{t.nome}</p>
                    <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      {t.id} · {t.tipo} · criado em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-[5px] uppercase"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      background: t.plano === "trial" ? `${T.amber}15` : `${T.esmeralda}15`,
                      color: t.plano === "trial" ? T.amber : T.esmeralda,
                    }}
                  >
                    {t.plano}
                  </span>
                  <span
                    className="px-2.5 py-1 rounded-[5px]"
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      background: t.ativo ? `${T.esmeralda}15` : `${T.danger}15`,
                      color: t.ativo ? T.esmeralda : T.danger,
                    }}
                  >
                    {t.ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog criar tenant */}
      <Dialog open={createOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{generatedLink ? "Tenant criado!" : "Novo tenant (workspace)"}</DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-3">
              <p style={{ fontSize: 13, color: T.text }}>
                Crie um workspace pra empresa cliente e gere o convite do admin inicial.
              </p>

              <div>
                <Label>Nome da empresa *</Label>
                <Input
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  placeholder="Ex: ACME Factoring"
                />
              </div>

              <div>
                <Label>Email do admin *</Label>
                <Input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@acme.com"
                />
                <p style={{ fontSize: 11, color: T.textMute, marginTop: 4 }}>
                  Pessoa que vai criar conta e gerenciar a equipe do workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={tenantTipo} onValueChange={(v) => setTenantTipo(v as TenantTipo)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="factoring">Factoring</SelectItem>
                      <SelectItem value="fidc">FIDC</SelectItem>
                      <SelectItem value="securitizadora">Securitizadora</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Plano</Label>
                  <Select value={tenantPlan} onValueChange={(v) => setTenantPlan(v as TenantPlan)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeDialog}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                  style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createTenant.mutate()}
                  disabled={!tenantName || !adminEmail || createTenant.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: T.marinho }}
                >
                  {createTenant.isPending && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
                  Criar tenant
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p style={{ fontSize: 13, color: T.text }}>
                Workspace criado. Envie este link pro admin <strong>{adminEmail}</strong> pra ele criar conta:
              </p>
              <div
                className="rounded-[8px] px-3 py-2.5 flex items-center gap-2"
                style={{ background: `${T.esmeralda}10`, border: `1px solid ${T.esmeralda}30` }}
              >
                <code className="flex-1 truncate" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.text }}>
                  {generatedLink}
                </code>
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(generatedLink!); toast.success("Link copiado"); }
                    catch { toast.error("Não consegui copiar"); }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium text-white"
                  style={{ background: T.marinho }}
                >
                  <Copy style={{ width: 11, height: 11 }} />
                  Copiar
                </button>
              </div>
              <button
                onClick={closeDialog}
                className="w-full py-2 rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
              >
                Fechar
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
