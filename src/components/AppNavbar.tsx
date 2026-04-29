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
  X,
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
          "flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium rounded-md transition-colors",
          "hover:bg-navbar-foreground/10 hover:text-navbar-foreground",
          isGroupActive
            ? "text-navbar-foreground bg-navbar-foreground/10"
            : "text-navbar-foreground/65"
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
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[420px]">
          <div className="bg-popover border border-border shadow-lg rounded-md p-2 grid grid-cols-2 gap-0.5">
            {group.items.map((item) => {
              const isActive = item.url === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.url);

              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-md transition-colors group/item",
                    "hover:bg-accent",
                    isActive && "bg-accent"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
                      isActive
                        ? "bg-primary/15 border-primary/30"
                        : "bg-muted border-border group-hover/item:bg-primary/10 group-hover/item:border-primary/30"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-foreground/70 group-hover/item:text-primary")} />
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-medium leading-tight", isActive ? "text-primary" : "text-foreground")}>{item.title}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</span>
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

function MobileNav({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[300px] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AT</div>
            <span className="text-base font-bold">Ambiente Teste</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-2 overflow-y-auto">
          <Link
            to="/consulta"
            onClick={() => onOpenChange(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-md transition-colors mb-2 border",
              location.pathname.startsWith("/consulta")
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/20"
            )}
          >
            <SearchCheck className="h-4 w-4" />
            <span className="font-semibold">Nova Consulta CPF/CNPJ</span>
          </Link>

          {directLinks.map((item) => {
            const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-md transition-colors",
                  isActive ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}

          {groups.map((group) => (
            <div key={group.title} className="mt-3">
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <group.icon className="h-3.5 w-3.5" />
                {group.title}
              </div>
              {group.items.map((item) => {
                const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 pl-6 text-sm rounded-md transition-colors",
                      isActive ? "bg-accent text-accent-foreground font-medium" : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          ))}

          <div className="mt-3 border-t border-border/50 pt-2">
            <Link
              to="/configuracoes"
              onClick={() => onOpenChange(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-md transition-colors",
                location.pathname.startsWith("/configuracoes")
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-foreground hover:bg-accent/50"
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

export function AppNavbar() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mega menu on navigation
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

  // Atalho Ctrl/Cmd+J → Consulta CPF/CNPJ (origem do fluxo)
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

  if (isMobile) {
    return (
      <>
        <header className="h-12 flex items-center justify-between px-4 border-b border-navbar/20 bg-navbar text-navbar-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AT</div>
            <span className="text-sm font-bold">Ambiente Teste</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-accent/50">
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
      </>
    );
  }

  return (
    <header className="h-12 flex items-center px-5 border-b border-navbar/20 bg-navbar text-navbar-foreground shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-4">
        <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AT</div>
        <span className="text-sm font-bold tracking-tight hidden lg:inline">Ambiente Teste</span>
      </Link>

      {/* CTA Origem do fluxo: Consulta CPF/CNPJ */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/consulta"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 mr-3 rounded-md text-[13px] font-semibold transition-colors border",
              location.pathname.startsWith("/consulta")
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/15 text-navbar-foreground border-primary/40 hover:bg-primary/25"
            )}
          >
            <SearchCheck className="h-4 w-4" />
            <span className="hidden md:inline">Nova Consulta</span>
            <kbd className="hidden xl:inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-navbar-foreground/15 border border-navbar-foreground/20">
              Ctrl+J
            </kbd>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">Consulta CPF/CNPJ — origem do fluxo (Ctrl+J)</TooltipContent>
      </Tooltip>

      <div className="h-5 w-px bg-navbar-foreground/20 mr-2" />

      {/* Direct links */}
      <nav className="flex items-center gap-0.5 min-w-0 flex-1">
        {directLinks.map((item) => {
          const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
          return (
            <Tooltip key={item.url}>
              <TooltipTrigger asChild>
                <Link
                  to={item.url}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    "hover:bg-navbar-foreground/15 hover:text-navbar-foreground",
                    isActive ? "text-navbar-foreground bg-navbar-foreground/15" : "text-navbar-foreground/70"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden xl:inline">{item.title}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="xl:hidden">
                {item.title}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Divider */}
        <div className="h-5 w-px bg-navbar-foreground/20 mx-1.5" />

        {/* Groups with mega menu */}
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

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <GlobalSearch />
        <NotificationBell />
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/configuracoes"
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "hover:bg-navbar-foreground/15 hover:text-navbar-foreground",
                location.pathname.startsWith("/configuracoes")
                  ? "text-navbar-foreground bg-navbar-foreground/15"
                  : "text-navbar-foreground/70"
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden xl:inline">Configurações</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="xl:hidden">
            Configurações
          </TooltipContent>
        </Tooltip>
        <div className="h-5 w-px bg-navbar-foreground/20 mx-0.5" />
        <UserAvatar />
      </div>
    </header>
  );
}
