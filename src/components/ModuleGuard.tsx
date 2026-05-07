import { Navigate } from "react-router-dom";
import { Loader2, ShieldOff } from "lucide-react";
import { useUserPermissions, type AppModule } from "@/hooks/useUserPermissions";

interface ModuleGuardProps {
  module: AppModule;
  children: React.ReactNode;
}

/**
 * Bloqueia rota se a role do usuário não tem permissão pro módulo.
 * Usar dentro do ProtectedRoute (sessão já validada).
 */
export function ModuleGuard({ module, children }: ModuleGuardProps) {
  const { canAccess, isSuperAdmin, isLoading, permissions } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Super-admin tem acesso a tudo
  if (isSuperAdmin) return <>{children}</>;

  // Usuário sem nenhuma permissão (provavelmente convite ainda não aceito)
  // Redireciona pra dashboard, que tem fallback amigável
  if (permissions.size === 0 && module !== "dashboard") {
    return <Navigate to="/" replace />;
  }

  if (!canAccess(module)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-base font-semibold">Você não tem acesso a este módulo</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Fale com o administrador do seu workspace pra liberar a permissão.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
