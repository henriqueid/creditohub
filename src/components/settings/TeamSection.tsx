import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Copy, Loader2, Shield, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { T } from "@/lib/tokens";

type AppRole = "admin" | "analista" | "comite" | "leitor";

const ROLE_META: Record<AppRole, { label: string; color: string; description: string }> = {
  admin:    { label: "Administrador", color: T.danger,    description: "Acesso total — gerencia equipe, comitê, configurações" },
  analista: { label: "Analista",      color: T.esmeralda, description: "Cria/edita análises, dossiê, deals" },
  comite:   { label: "Comitê",        color: T.amber,     description: "Vota em análises encaminhadas" },
  leitor:   { label: "Leitor",        color: T.textMute,  description: "Somente leitura" },
};

export function TeamSection() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);

  // Quem sou (pra checar admin)
  const { data: me } = useQuery({
    queryKey: ["me-roles"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { userId: null, isAdmin: false };
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      const isAdmin = (roles || []).some((r: any) => r.role === "admin");
      return { userId: u.user.id, isAdmin };
    },
  });

  // Colegas (mesmo tenant)
  const { data: colleagues = [], isLoading: loadingPeople } = useQuery({
    queryKey: ["tenant-colleagues"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tenant_colleagues");
      if (error) throw error;
      return (data || []) as { user_id: string; full_name: string; cargo: string; avatar_url: string }[];
    },
  });

  // Roles atuais de todos do tenant
  const { data: allRoles = [] } = useQuery({
    queryKey: ["all-tenant-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      return (data || []) as { user_id: string; role: AppRole }[];
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
      // Remove roles antigas e seta a nova
      const { error: delErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      // Pega tenant_id do user
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", userId)
        .maybeSingle();
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

  const inviteUrl = `${window.location.origin}/auth`;
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("Não consegui copiar — copie manualmente");
    }
  };

  if (loadingPeople) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
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
            const meta = ROLE_META[primaryRole];
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

      {!me?.isAdmin && (
        <p className="text-[11.5px]" style={{ color: T.textMute }}>
          Apenas administradores podem convidar usuários ou alterar permissões.
        </p>
      )}

      {/* Convite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Convidar pra equipe</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p style={{ fontSize: 13, color: T.text }}>
              Compartilhe este link com a pessoa que você quer adicionar. Ela vai criar a conta e
              <strong> entrar automaticamente no seu workspace</strong>. Depois ajuste a permissão dela aqui.
            </p>

            <div
              className="rounded-[8px] px-3 py-2.5 flex items-center gap-2"
              style={{ background: `${T.esmeralda}10`, border: `1px solid ${T.esmeralda}30` }}
            >
              <code
                className="flex-1 truncate"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: T.text }}
              >
                {inviteUrl}
              </code>
              <button
                onClick={copyInvite}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] text-[11.5px] font-medium text-white transition-opacity hover:opacity-90 flex-shrink-0"
                style={{ background: T.marinho }}
              >
                <Copy style={{ width: 11, height: 11 }} />
                Copiar
              </button>
            </div>

            <div
              className="rounded-[8px] px-3 py-2.5"
              style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}30` }}
            >
              <p style={{ fontSize: 11.5, color: T.text, lineHeight: 1.5 }}>
                <strong>Importante:</strong> Por padrão o novo usuário entra como <strong>leitor</strong>.
                Após o cadastro, encontre o nome dele acima e ajuste a permissão.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p style={{ fontSize: 11.5, fontWeight: 600, color: T.text }}>Tipos de permissão:</p>
              {(Object.keys(ROLE_META) as AppRole[]).map((r) => (
                <div key={r} className="flex items-start gap-2 text-[12px]">
                  <span
                    className="px-2 py-0.5 rounded-[4px] flex-shrink-0"
                    style={{
                      background: `${ROLE_META[r].color}15`,
                      color: ROLE_META[r].color,
                      fontSize: 10.5,
                      fontWeight: 600,
                      minWidth: 90,
                      textAlign: "center",
                    }}
                  >
                    {ROLE_META[r].label}
                  </span>
                  <span style={{ color: T.textMute }}>{ROLE_META[r].description}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
