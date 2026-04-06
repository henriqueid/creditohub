import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Painel Inicial",
  "cedentes": "Cedentes",
  "novo": "Novo Cadastro",
  "historico": "Histórico",
  "analises": "Análises de Crédito",
  "nova": "Nova Análise",
  "comite": "Comitê de Crédito",
  "consulta": "Consulta CPF/CNPJ",
  "prospects": "Prospects",
  "monitoramento-nfs": "Monitoramento NFs",
  "falimentar": "Informe Falimentar",
  "blacklist": "Blacklist",
  "configuracoes": "Configurações",
  "motor": "Motor de Crédito",
};

function isUuid(segment: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

export function AppBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = isUuid(seg) ? "Detalhes" : (routeLabels[seg] || seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <div className="border-b border-border px-5 py-2 bg-card">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Início</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb) => (
            <span key={crumb.path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="text-xs font-medium">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path} className="text-xs">{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
