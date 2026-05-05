import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import { UserAvatar } from "@/components/UserAvatar";
import {
  LayoutDashboard,
  SearchCheck,
  UserSearch,
  Building2,
  FileText,
  Users,
  FileBarChart,
  Scale,
  ShieldBan,
  Settings,
  Menu,
  ChevronDown,
  CreditCard,
  TrendingUp,
  Handshake,
  Contact,
  MessageSquare,
  CheckSquare,
  Receipt,
  Gauge,
  Filter,
  Eye,
  Plug,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/* ── Tipos ───────────────────────────────────────────────────────── */

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  description?: string;
}

interface NavGroup {
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

/* ── Dados de navegação ──────────────────────────────────────────── */

const directLinks: NavItem[] = [
  { title: "Painel Inicial", url: "/", icon: LayoutDashboard },
];

const crmGroup: NavGroup = {
  title: "Comercial",
  icon: Handshake,
  items: [
    { title: "Dashboard CRM", url: "/crm/dashboard", icon: TrendingUp, description: "Métricas e forecast de vendas" },
    { title: "Pipeline", url: "/crm/pipeline", icon: Filter, description: "Funil de oportunidades" },
    { title: "Prospects", url: "/prospects", icon: UserSearch, description: "Captação e qualificação de leads" },
    { title: "Contatos", url: "/crm/contatos", icon: Contact, description: "Gestão de contatos" },
    { title: "Atividades", url: "/crm/atividades", icon: MessageSquare, description: "Histórico de interações" },
    { title: "Tarefas", url: "/crm/tarefas", icon: CheckSquare, description: "Follow-ups e pendências" },
  ],
};

const esteiraGroup: NavGroup = {
  title: "Crédito",
  icon: CreditCard,
  items: [
    { title: "Cedentes", url: "/cedentes", icon: Building2, description: "Cadastro e esteira dos cedentes" },
    { title: "Análises de Crédito", url: "/analises", icon: FileText, description: "Dossiês e pareceres" },
    { title: "Comitê de Crédito", url: "/comite", icon: Users, description: "Votação e deliberação" },
    { title: "Patrimonial", url: "/patrimonial", icon: Landmark, description: "Bens e garantias dos cedentes" },
    { title: "Performance", url: "/performance", icon: Gauge, description: "Métricas e gargalos da esteira" },
  ],
};

const monitorGroup: NavGroup = {
  title: "Monitoramento",
  icon: Eye,
  items: [
    { title: "Notas Fiscais", url: "/monitoramento-nfs", icon: Receipt, description: "Acompanhamento e validação de NFs" },
    { title: "Informe Falimentar", url: "/falimentar", icon: Scale, description: "Recuperações judiciais e falências" },
    { title: "Blacklist", url: "/blacklist", icon: ShieldBan, description: "Restrições e bloqueios" },
    { title: "Integrações", url: "/integracoes", icon: Plug, description: "APIs e fontes de dados externas" },
  ],
};

const groups: NavGroup[] = [crmGroup, esteiraGroup, monitorGroup];

/* ── MegaMenu dropdown ───────────────────────────────────────────── */

function MegaMenuDropdown({
  group,
  isOpen,
  onMouseEnter,
  onMouseLeave,
}: {
  group: NavGroup;
  isOpen: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const location = useLocation();
  const isGroupActive = group.items.some((item) =>
    item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url)
  );

  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-sink-sm transition-colors duration-150",
          isGroupActive
            ? "text-white bg-white/10"
            : "text-sink-cream/70 hover:text-sink-cream hover:bg-white/8"
        )}
      >
        <group.icon className="h-4 w-4" />
        <span>{group.title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[440px]">
          {/* Seta */}
          <div className="absolute -top-1 left-6 h-2 w-2 rotate-45 bg-sink-paper border-l border-t border-sink-fog/60" />
          <div
            className={cn(
              "bg-sink-paper border border-sink-fog/60 shadow-sink-lg rounded-sink-md p-2",
              "grid grid-cols-2 gap-0.5"
            )}
          >
            {group.items.map((item) => {
              const isActive =
                item.url === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.url);

              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-sink-sm transition-colors group/item",
                    isActive
                      ? "bg-sink-mint-soft"
                      : "hover:bg-sink-cream-2"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sink-sm border",
                      isActive
                        ? "bg-sink-mint/20 border-sink-mint/40"
                        : "bg-sink-cream border-sink-fog group-hover/item:bg-sink-mint/10 group-hover/item:border-sink-mint/30"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4",
                        isActive
                          ? "text-sink-mint-3"
                          : "text-sink-ink/50 group-hover/item:text-sink-mint-3"
                      )}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        "text-[13px] font-medium leading-tight",
                        isActive ? "text-sink-mint-3" : "text-sink-ink"
                      )}
                    >
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="text-[11px] text-sink-ink/50 mt-0.5 leading-snug">
                        {item.description}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile nav (Sheet) ──────────────────────────────────────────── */

function MobileNav({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0 bg-sink-deep border-sink-deep-4">
        <SheetHeader className="p-4 border-b border-sink-deep-4/60">
          <SheetTitle className="flex items-center gap-2">
            <img src="/logo.svg" alt="CreditoHub" className="h-7 w-7" />
            <span className="text-base font-bold text-white">
              Credito<span className="text-sink-mint">Hub</span>
            </span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col p-2 overflow-y-auto">
          {/* CTA Consulta */}
          <Link
            to="/consulta"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold rounded-sink-sm transition-colors mb-2 border",
              location.pathname.startsWith("/consulta")
                ? "bg-sink-mint text-sink-deep border-sink-mint"
                : "bg-sink-mint/15 text-sink-cream border-sink-mint/40 hover:bg-sink-mint/25"
            )}
          >
            <SearchCheck className="h-4 w-4" />
            Nova Consulta CPF/CNPJ
          </Link>

          {/* Direct links */}
          {directLinks.map((item) => {
            const isActive =
              item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-sink-sm transition-colors",
                  isActive
                    ? "bg-sink-deep-3 text-white border-l-2 border-sink-mint pl-[10px]"
                    : "text-sink-cream/70 hover:text-sink-cream hover:bg-sink-deep-3"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}

          {/* Groups */}
          {groups.map((group) => (
            <div key={group.title} className="mt-3">
              <div className="px-3 py-1 text-[10px] font-semibold text-sink-fog/40 uppercase tracking-widest flex items-center gap-1.5">
                <group.icon className="h-3.5 w-3.5" />
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive =
                  item.url === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.url);
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 pl-6 text-[13px] rounded-sink-sm transition-colors",
                      isActive
                        ? "bg-sink-deep-3 text-white border-l-2 border-sink-mint pl-[22px]"
                        : "text-sink-cream/70 hover:text-sink-cream hover:bg-sink-deep-3"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Configurações */}
          <div className="mt-3 border-t border-sink-deep-4/60 pt-2">
            <Link
              to="/configuracoes"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-[13px] rounded-sink-sm transition-colors",
                location.pathname.startsWith("/configuracoes")
                  ? "bg-sink-deep-3 text-white border-l-2 border-sink-mint pl-[10px]"
                  : "text-sink-cream/70 hover:text-sink-cream hover:bg-sink-deep-3"
              )}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/* ── AppNavbar ───────────────────────────────────────────────────── */

export function AppNavbar() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fechar mega-menu na navegação
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Atalho Ctrl/Cmd+J → Consulta CPF/CNPJ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        navigate("/consulta");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const handleMouseEnter = (title: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenMenu(title);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenMenu(null), 150);
  };

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <>
        <header className="h-14 flex items-center justify-between px-4 bg-sink-deep border-b border-sink-deep-4/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="CreditoHub" className="h-7 w-7" />
            <span className="text-[15px] font-bold text-white tracking-tight">
              Credito<span className="text-sink-mint">Hub</span>
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-sink-sm text-sink-cream/70 hover:text-sink-cream hover:bg-sink-deep-3 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
      </>
    );
  }

  /* ── Desktop ── */
  return (
    <header className="h-14 flex items-center px-4 gap-2 bg-sink-deep border-b border-sink-deep-4/60 shrink-0">

      {/* Wordmark */}
      <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-1">
        <img src="/logo.svg" alt="CreditoHub" className="h-7 w-7" />
        <span className="text-[15px] font-bold text-white tracking-tight hidden lg:inline">
          Credito<span className="text-sink-mint">Hub</span>
        </span>
      </Link>

      {/* CTA principal: Consulta */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/consulta"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sink-sm text-[13px] font-semibold transition-colors border shrink-0",
              location.pathname.startsWith("/consulta")
                ? "bg-sink-mint text-sink-deep border-sink-mint"
                : "bg-sink-mint/15 text-sink-cream border-sink-mint/40 hover:bg-sink-mint/25 hover:text-white"
            )}
          >
            <SearchCheck className="h-4 w-4" />
            <span className="hidden xl:inline">Nova Consulta</span>
            <kbd className="hidden 2xl:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 border border-white/15">
              Ctrl+J
            </kbd>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Consulta CPF/CNPJ — origem do fluxo (Ctrl+J)
        </TooltipContent>
      </Tooltip>

      {/* Divisor */}
      <div className="h-5 w-px bg-sink-deep-4 shrink-0" />

      {/* Links diretos + grupos */}
      <nav className="flex items-center gap-0.5 min-w-0 flex-1">
        {directLinks.map((item) => {
          const isActive =
            item.url === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.url);
          return (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-2 text-[13px] font-medium rounded-sink-sm transition-colors",
                    isActive
                      ? "text-white bg-white/10"
                      : "text-sink-cream/70 hover:text-sink-cream hover:bg-white/8"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden 2xl:inline">{item.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="2xl:hidden text-xs">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="h-5 w-px bg-sink-deep-4 mx-1" />

        {groups.map((group) => (
          <MegaMenuDropdown
            key={group.title}
            group={group}
            isOpen={openMenu === group.title}
            onMouseEnter={() => handleMouseEnter(group.title)}
            onMouseLeave={handleMouseLeave}
          />
        ))}
      </nav>

      {/* Direita */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {/* Busca global — adaptada para fundo escuro */}
        <GlobalSearch />
        <NotificationBell />

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/configuracoes"
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-sink-sm transition-colors",
                location.pathname.startsWith("/configuracoes")
                  ? "text-white bg-white/10"
                  : "text-sink-cream/60 hover:text-sink-cream hover:bg-white/8"
              )}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Configurações</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-sink-deep-4 mx-0.5" />
        <UserAvatar />
      </div>
    </header>
  );
}
