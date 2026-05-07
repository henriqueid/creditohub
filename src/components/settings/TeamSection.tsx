import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Loader2, Shield, ShieldCheck, Mail, Trash2, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { T } from "@/lib/tokens";

type AppRole = "admin" | "analista" | "comercial" | "comite" | "leitor";

const ROLE_META: Record<AppRole, { label: string; color: string; description: string }> = {
  admin:     { label: "Administrador", color: T.danger,    description: "Acesso total — gerencia equipe, configurações, permissões" },
  analista:  { label: "Analista",      color: T.esmeralda, description: "Análises, comitê, dossiê, fluxo de crédito" },
  comercial: { label: "Comercial",     color: T.marinho,   description: "CRM, prospects, cedentes — sem acesso ao crédito" },
  comite:    { label: "Comitê",        color: T.amber,     description: "Vota em análises encaminhadas" },
  leitor:    { label: "Leitor",        color: T.textMute,  description: "Somente leitura" },
};

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export function TeamSection() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("leitor");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Quem sou (admin?)
  const { data: me } = useQuery({
    queryKey: ["me-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { userId: null, isAdmin: false, tenantId: null };
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role, tenant_id")
        .eq("user_id", u.user.id);
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      const tenantId = (roles?.[0] as any)?.tenant_id || null;
      return { userId: u.user.id, isAdmin, tenantId };
    },
  });

  const { data: colleagues = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["tenant-colleagues"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tenant_colleagues");
      if (error) throw error;
      return (data || []) as { user_id: string; full_name: string; cargo: string; avatar_url: string }[];
    },
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-tenant-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      return (data || []) as { user_id: string; role: AppRole }[];
    },
  });

  const { data: invitations = [], isLoading: loadingInvites } = useQuery({
    queryKey: ["pending-invitations"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_invitations")
        .select("id, email, role, token, expires_at, used_at, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Invitation[];
    },
  });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const r of allRoles) {
      if (!map.has(r.user_id)) map.set(r.user_id, []);
      map.get(r.user_id)!.push(r.role);
    }
    return map;
  }, [allRoles]);

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (delErr) throw delErr;

      const { data: profile } = await supabase
        .from("profiles").select("tenant_id").eq("user_id", userId).maybeSingle() as any;
      if (!profile?.tenant_id) throw new Error("Usuário sem tenant");

      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, tenant_id: profile.tenant_id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-tenant-roles"] });
      toast.success("Permissão atualizada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar permissão"),
  });

  const createInvite = useMutation({
    mutationFn: async () => {
      if (!inviteEmail.trim()) throw new Error("Informe o email");
      if (!me?.tenantId) throw new Error("Tenant não encontrado");
      const { data, error } = await supabase
        .from("pending_invitations")
        .insert({ tenant_id: me.tenantId, email: inviteEmail.trim().toLowerCase(), role: inviteRole })
        .select("token")
        .single();
      if (error) throw error;
      return data.token as string;
    },
    onSuccess: (token) => {
      qc.invalidateQueries({ queryKey: ["pending-invitations"] });
      const link = `${window.location.origin}/auth?invite=${token}`;
      setGeneratedLink(link);
      toast.success("Convite criado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar convite"),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pending_invitations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-invitations"] });
      toast.success("Convite revogado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao revogar"),
  });

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/auth?invite=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado");
    } catch {
      toast.error("Não consegui copiar");
    }
  };

  const closeInviteDialog = () => {
    setInviteOpen(false);
    setInviteEmail("");
    setInviteRole("leitor");
    setGeneratedLink(null);
  };

  if (loadingPeople) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
      </div>
    );
  }

  const pendingInvites = invitations.filter((i) => !i.used_at);

  return (
    <div className="space-y-5">
      {/* Equipe atual */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
              Equipe ({colleagues.length})
            </h3>
            <p style={{ fontSize: 12, color: T.textMute, marginTop: 2 }}>
              Usuários do seu workspace e suas permissões
            </p>
          </div>
          {me?.isAdmin && (
            <button
              onClick={() => setInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ background: T.marinho }}
            >
              <UserPlus style={{ width: 14, height: 14 }} />
              Convidar
            </button>
          )}
        </div>

        <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
          {colleagues.length === 0 ? (
            <p className="py-6 text-center" style={{ fontSize: 13, color: T.textFaint }}>
              Você é o único usuário do workspace
            </p>
          ) : (
            colleagues.map((c, i) => {
              const roles = rolesByUser.get(c.user_id) || [];
              const primaryRole = (roles[0] || "leitor") as AppRole;
              const meta = ROLE_META[primaryRole] || ROLE_META.leitor;
              const isMe = c.user_id === me?.userId;
              return (
                <div
                  key={c.user_id}
                  className="flex items-center justify-between gap-3 p-3"
                  style={{ borderTop: i === 0 ? "none" : `1px solid ${T.border}` }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 36, height: 36,
                        background: `${T.esmeralda}15`,
                        color: T.esmeralda,
                        fontSize: 14, fontWeight: 600,
                      }}
                    >
                      {(c.full_name || "?").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
                          {c.full_name || "Usuário sem nome"}
                        </span>
                        {isMe && (
                          <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: T.esmeralda, fontWeight: 700 }}>
                            (VOCÊ)
                          </span>
                        )}
                      </div>
                      {c.cargo && (
                        <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>{c.cargo}</p>
                      )}
                    </div>
                  </div>

                  {me?.isAdmin && !isMe ? (
                    <Select
                      value={primaryRole}
                      onValueChange={(v) => setRoleMutation.mutate({ userId: c.user_id, role: v as AppRole })}
                    >
                      <SelectTrigger className="h-8 w-[150px] text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            <span style={{ color: ROLE_META[r].color }}>{ROLE_META[r].label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div
                      className="px-2.5 py-1 rounded-[6px] inline-flex items-center gap-1.5"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        fontSize: 11.5,
                        fontWeight: 600,
                      }}
                    >
                      {primaryRole === "admin" ? <ShieldCheck style={{ width: 11, height: 11 }} /> : <Shield style={{ width: 11, height: 11 }} />}
                      {meta.label}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Convites pendentes */}
      {me?.isAdmin && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 8 }}>
            Convites pendentes ({pendingInvites.length})
          </h3>
          {loadingInvites ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: T.textMute }} />
            </div>
          ) : pendingInvites.length === 0 ? (
            <p style={{ fontSize: 12, color: T.textFaint, padding: "12px 0" }}>
              Nenhum convite pendente
            </p>
          ) : (
            <div className="rounded-[10px] overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
              {pendingInvites.map((inv, i) => {
                const expired = new Date(inv.expires_at) < new Date();
                const meta = ROLE_META[inv.role] || ROLE_META.leitor;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-3 p-3"
                    style={{ borderTop: i === 0 ? "none" : `1px solid ${T.border}`, opacity: expired ? 0.6 : 1 }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Mail style={{ width: 16, height: 16, color: T.textMute, flexShrink: 0 }} />
                      <div className="min-w-0 flex-1">
                        <p style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{inv.email}</p>
                        <p style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}>
                          {expired ? "Expirado" : `Expira em ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}`}
                        </p>
                      </div>
                    </div>
                    <div
                      className="px-2 py-0.5 rounded-[5px]"
                      style={{ background: `${meta.color}15`, color: meta.color, fontSize: 11, fontWeight: 600 }}
                    >
                      {meta.label}
                    </div>
                    <button
                      onClick={() => copyLink(inv.token)}
                      title="Copiar link"
                      className="p-1.5 rounded hover:bg-[#F0F1EB]"
                    >
                      <Copy style={{ width: 13, height: 13, color: T.textMute }} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Revogar convite pra ${inv.email}?`)) revokeInvite.mutate(inv.id);
                      }}
                      title="Revogar"
                      className="p-1.5 rounded hover:bg-[#F0F1EB]"
                    >
                      <Trash2 style={{ width: 13, height: 13, color: T.danger }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!me?.isAdmin && (
        <p className="text-[11.5px]" style={{ color: T.textMute }}>
          Apenas administradores podem convidar usuários ou alterar permissões.
        </p>
      )}

      {/* Convite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(o) => !o && closeInviteDialog()}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{generatedLink ? "Convite gerado" : "Convidar usuário"}</DialogTitle>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-3">
              <p style={{ fontSize: 13, color: T.text }}>
                Digite o email e a permissão. Vamos gerar um link único de convite — copie e envie pra pessoa.
              </p>

              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="pessoa@empresa.com"
                />
              </div>

              <div>
                <Label>Permissão *</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        <div className="flex flex-col">
                          <span style={{ color: ROLE_META[r].color, fontWeight: 600 }}>{ROLE_META[r].label}</span>
                          <span style={{ fontSize: 11, color: T.textMute }}>{ROLE_META[r].description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="rounded-[8px] px-3 py-2 flex items-start gap-2"
                style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}30` }}
              >
                <Clock style={{ width: 12, height: 12, color: T.amber, marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 11.5, color: T.text, lineHeight: 1.4 }}>
                  Convite válido por 14 dias. Você pode revogar a qualquer momento.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={closeInviteDialog}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                  style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createInvite.mutate()}
                  disabled={!inviteEmail || createInvite.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: T.marinho }}
                >
                  {createInvite.isPending && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
                  Gerar convite
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p style={{ fontSize: 13, color: T.text }}>
                Convite enviado pra <strong>{inviteEmail}</strong> como <strong>{ROLE_META[inviteRole].label}</strong>. Copie o link e envie:
              </p>

              <div
                className="rounded-[8px] px-3 py-2.5 flex items-center gap-2"
                style={{ background: `${T.esmeralda}10`, border: `1px solid ${T.esmeralda}30` }}
              >
                <code
                  className="flex-1 truncate"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.text }}
                >
                  {generatedLink}
                </code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(generatedLink);
                      toast.success("Link copiado");
                    } catch {
                      toast.error("Não consegui copiar");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium text-white transition-opacity hover:opacity-90 flex-shrink-0"
                  style={{ background: T.marinho }}
                >
                  <Copy style={{ width: 11, height: 11 }} />
                  Copiar
                </button>
              </div>

              <button
                onClick={closeInviteDialog}
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
