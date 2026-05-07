import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppModule =
  | "dashboard"
  | "consulta"
  | "prospects"
  | "cedentes"
  | "credito"
  | "crm"
  | "relatorios"
  | "blacklist"
  | "audit_log"
  | "settings_geral"
  | "settings_equipe";

export const APP_MODULES: { key: AppModule; label: string; description: string }[] = [
  { key: "dashboard",       label: "Dashboard",            description: "Painel inicial e KPIs" },
  { key: "consulta",        label: "Consulta CNPJ",         description: "Consulta de empresas e bureaus" },
  { key: "prospects",       label: "Prospects",             description: "Inbox de leads pré-qualificados" },
  { key: "cedentes",        label: "Cedentes (portfólio)",  description: "Cadastro e perfil de cedentes" },
  { key: "credito",         label: "Crédito",               description: "Análises, comitê, motor de crédito, bureaus" },
  { key: "crm",             label: "CRM",                   description: "Pipeline, atividades, tarefas, contatos" },
  { key: "relatorios",      label: "Relatórios",            description: "Performance, falimentar, patrimonial" },
  { key: "blacklist",       label: "Blacklist",             description: "Documentos bloqueados" },
  { key: "audit_log",       label: "Audit log",             description: "Histórico de alterações sensíveis" },
  { key: "settings_geral",  label: "Configurações gerais",  description: "Empresa, integrações, automação" },
  { key: "settings_equipe", label: "Equipe e permissões",   description: "Convidar usuários, ajustar roles" },
];

interface PermissionsResult {
  permissions: Set<AppModule>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAccess: (module: AppModule) => boolean;
}

export function useUserPermissions(): PermissionsResult & { isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["user-permissions"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        return { modules: [] as AppModule[], isAdmin: false, isSuperAdmin: false };
      }

      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role, tenant_id").eq("user_id", u.user.id),
        supabase.from("profiles").select("is_super_admin").eq("user_id", u.user.id).maybeSingle() as any,
      ]);

      const roles = (rolesRes.data || []) as { role: string; tenant_id: string }[];
      const isAdmin = roles.some((r) => r.role === "admin");
      const isSuperAdmin = !!(profileRes.data as any)?.is_super_admin;

      if (roles.length === 0) {
        return { modules: [] as AppModule[], isAdmin, isSuperAdmin };
      }

      const tenantId = roles[0].tenant_id;
      const userRoles = roles.map((r) => r.role);

      const { data: perms } = await supabase
        .from("tenant_role_permissions")
        .select("module, role, can_access")
        .eq("tenant_id", tenantId)
        .eq("can_access", true)
        .in("role", userRoles);

      const modules = Array.from(new Set((perms || []).map((p: any) => p.module as AppModule)));
      return { modules, isAdmin, isSuperAdmin };
    },
    staleTime: 60 * 1000,
  });

  const permissions = new Set<AppModule>(data?.modules || []);

  return {
    permissions,
    isAdmin: data?.isAdmin || false,
    isSuperAdmin: data?.isSuperAdmin || false,
    canAccess: (m: AppModule) => permissions.has(m),
    isLoading,
  };
}
