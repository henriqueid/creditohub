import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, AlertCircle, ShieldCheck } from "lucide-react";
import { APP_MODULES, type AppModule } from "@/hooks/useUserPermissions";
import { T } from "@/lib/tokens";

type AppRole = "admin" | "analista" | "comercial" | "comite" | "leitor";

const ROLES: { key: AppRole; label: string; color: string }[] = [
  { key: "admin",     label: "Admin",     color: T.danger },
  { key: "analista",  label: "Analista",  color: T.esmeralda },
  { key: "comercial", label: "Comercial", color: T.marinho },
  { key: "comite",    label: "Comitê",    color: T.amber },
  { key: "leitor",    label: "Leitor",    color: T.textMute },
];

interface Permission {
  role: AppRole;
  module: AppModule;
  can_access: boolean;
}

export function PermissionsMatrix() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Map<string, boolean>>(new Map());
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Tenant atual (do user logado)
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("user_id", u.user.id)
        .maybeSingle() as any;
      if (data?.tenant_id) setTenantId(data.tenant_id);
    })();
  }, []);

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["tenant-role-permissions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_role_permissions")
        .select("role, module, can_access")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return (data || []) as Permission[];
    },
  });

  // Initial draft from server
  useEffect(() => {
    if (permissions.length > 0 && draft.size === 0) {
      const m = new Map<string, boolean>();
      for (const p of permissions) m.set(`${p.role}::${p.module}`, p.can_access);
      setDraft(m);
    }
  }, [permissions, draft.size]);

  const matrix = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const p of permissions) map.set(`${p.role}::${p.module}`, p.can_access);
    return map;
  }, [permissions]);

  const dirtyEntries = useMemo(() => {
    const out: { role: AppRole; module: AppModule; can_access: boolean }[] = [];
    for (const [key, val] of draft.entries()) {
      const original = matrix.get(key) ?? false;
      if (val !== original) {
        const [role, module] = key.split("::") as [AppRole, AppModule];
        out.push({ role, module, can_access: val });
      }
    }
    return out;
  }, [draft, matrix]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || dirtyEntries.length === 0) return;
      const payload = dirtyEntries.map((e) => ({
        tenant_id: tenantId,
        role: e.role,
        module: e.module,
        can_access: e.can_access,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("tenant_role_permissions")
        .upsert(payload, { onConflict: "tenant_id,role,module" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-role-permissions", tenantId] });
      qc.invalidateQueries({ queryKey: ["user-permissions"] });
      toast.success(`${dirtyEntries.length} permissão(ões) atualizada(s)`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const get = (role: AppRole, module: AppModule) => {
    const key = `${role}::${module}`;
    return draft.has(key) ? draft.get(key)! : matrix.get(key) ?? false;
  };

  const toggle = (role: AppRole, module: AppModule) => {
    const key = `${role}::${module}`;
    const current = get(role, module);
    const next = new Map(draft);
    next.set(key, !current);
    setDraft(next);
  };

  if (isLoading || !tenantId) {
    return (
      <div className="py-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: T.textMute }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-[10px] px-4 py-3 flex items-start gap-2.5"
        style={{ background: `${T.amber}10`, border: `1px solid ${T.amber}30` }}
      >
        <AlertCircle style={{ width: 14, height: 14, color: T.amber, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
          A role <strong>Admin</strong> tem acesso total. Cuidado ao desmarcar permissões dela —
          você pode ficar trancado fora do próprio workspace.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[10px]" style={{ border: `1px solid ${T.border}` }}>
        <table className="w-full" style={{ fontSize: 13, minWidth: 720 }}>
          <thead>
            <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
              <th
                className="text-left px-4 py-3"
                style={{ fontSize: 11, fontWeight: 600, color: T.textMute, textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Módulo
              </th>
              {ROLES.map((r) => (
                <th
                  key={r.key}
                  className="px-3 py-3 text-center"
                  style={{ fontSize: 11, fontWeight: 700, color: r.color, textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 90 }}
                >
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APP_MODULES.map((m, i) => (
              <tr
                key={m.key}
                style={{
                  background: i % 2 === 0 ? T.white : T.off,
                  borderBottom: i < APP_MODULES.length - 1 ? `1px solid ${T.border}` : "none",
                }}
              >
                <td className="px-4 py-3">
                  <div style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>{m.description}</div>
                </td>
                {ROLES.map((r) => {
                  const checked = get(r.key, m.key);
                  const isAdminLocked = r.key === "admin"; // visual hint, mas permite desmarcar
                  return (
                    <td key={r.key} className="px-3 py-3 text-center">
                      <label className="inline-flex cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(r.key, m.key)}
                          className="sr-only peer"
                        />
                        <span
                          className="w-5 h-5 rounded-[5px] flex items-center justify-center transition-all"
                          style={{
                            background: checked ? r.color : T.white,
                            border: `1.5px solid ${checked ? r.color : T.borderStrong}`,
                            boxShadow: checked ? `0 0 0 3px ${r.color}15` : "none",
                            opacity: isAdminLocked ? 0.95 : 1,
                          }}
                        >
                          {checked && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p style={{ fontSize: 11.5, color: T.textMute }}>
          {dirtyEntries.length === 0 ? (
            "Nenhuma alteração pendente"
          ) : (
            <span style={{ color: T.amber, fontWeight: 600 }}>
              {dirtyEntries.length} alteração(ões) não salvas
            </span>
          )}
        </p>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={dirtyEntries.length === 0 || saveMutation.isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: T.marinho }}
        >
          {saveMutation.isPending
            ? <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
            : <Save style={{ width: 14, height: 14 }} />}
          Salvar permissões
        </button>
      </div>

      <div className="pt-3" style={{ borderTop: `1px solid ${T.border}` }}>
        <p style={{ fontSize: 11.5, fontWeight: 600, color: T.text, marginBottom: 8 }}>
          <ShieldCheck style={{ width: 12, height: 12, display: "inline", marginRight: 4, color: T.esmeralda }} />
          Roles do sistema:
        </p>
        <div className="space-y-1.5">
          {ROLES.map((r) => (
            <div key={r.key} className="flex items-start gap-2 text-[12px]">
              <span
                className="px-2 py-0.5 rounded-[4px] flex-shrink-0"
                style={{
                  background: `${r.color}15`,
                  color: r.color,
                  fontSize: 10.5,
                  fontWeight: 600,
                  minWidth: 80,
                  textAlign: "center",
                }}
              >
                {r.label}
              </span>
              <span style={{ color: T.textMute }}>{describeRole(r.key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function describeRole(role: AppRole): string {
  switch (role) {
    case "admin":     return "Acesso total — gerencia equipe, comitê, configurações, permissões";
    case "analista":  return "Análises de crédito, dossiê, comitê — fluxo completo de crédito";
    case "comercial": return "CRM, prospects, cedentes — fluxo comercial sem acesso ao crédito";
    case "comite":    return "Vota em análises encaminhadas ao comitê";
    case "leitor":    return "Somente leitura — útil pra auditoria externa";
  }
}
