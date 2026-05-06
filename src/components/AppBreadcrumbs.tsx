import { useLocation, Link } from "react-router-dom";

const routeLabels: Record<string, string> = {
  "":                  "Painel",
  "cedentes":          "Cedentes",
  "novo":              "Novo Cadastro",
  "historico":         "Histórico",
  "analises":          "Análises de Crédito",
  "nova":              "Nova Análise",
  "comite":            "Comitê de Crédito",
  "consulta":          "Consulta CPF/CNPJ",
  "prospects":         "Prospects",
  "monitoramento-nfs": "Monitoramento de NFs",
  "performance":       "Performance da Esteira",
  "falimentar":        "Informe Falimentar",
  "blacklist":         "Blacklist",
  "configuracoes":     "Configurações",
  "motor":             "Motor de Crédito",
  "bureaus":           "Bureaus",
  "integracoes":       "Integrações",
  "audit-log":         "Auditoria",
  "patrimonial":       "Patrimonial",
  "crm":               "Comercial",
  "pipeline":          "Pipeline",
  "contatos":          "Contatos",
  "atividades":        "Atividades",
  "tarefas":           "Tarefas",
  "dashboard":         "Painel",
  "cliente":           "Perfil do Cliente",
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
    const label = isUuid(seg) ? "Detalhes" : (routeLabels[seg] ?? seg);
    const isLast = i === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <div
      className="flex items-center gap-2 px-7 flex-shrink-0"
      style={{
        height: "var(--breadcrumb-height)",
        background: "var(--off)",
        borderBottom: "1px solid var(--hairline)",
        fontFamily: "var(--font-sans)",
        fontSize: 12,
      }}
    >
      <Link
        to="/"
        className="transition-colors"
        style={{ color: "var(--text-faint)" }}
      >
        Painel
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={crumb.path} className="contents">
          <span style={{ color: "var(--text-faint)", opacity: 0.5 }}>›</span>
          {crumb.isLast ? (
            <span style={{ color: "var(--text)", fontWeight: 500 }}>
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="transition-colors hover:opacity-80"
              style={{ color: "var(--text-mute)" }}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
