import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
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
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  { title: "Consulta CPF/CNPJ", url: "/consulta", icon: SearchCheck },
];

const esteiraGroup: NavGroup = {
  title: "Esteira de Crédito",
  icon: GitBranch,
  items: [
    { title: "Prospects", url: "/prospects", icon: UserSearch, description: "Gestão de prospects e leads" },
    { title: "Cedentes", url: "/cedentes", icon: Building2, description: "Cadastro de cedentes ativos" },
    { title: "Análises de Crédito", url: "/analises", icon: FileText, description: "Dossiês e pareceres" },
    { title: "Comitê de Crédito", url: "/comite", icon: Users, description: "Votação e deliberação" },
  ],
};

const monitorGroup: NavGroup = {
  title: "Monitoramento",
  icon: FileBarChart,
  items: [
    { title: "Monitoramento NFs", url: "/monitoramento-nfs", icon: FileBarChart, description: "Acompanhamento de notas fiscais" },
    { title: "Informe Falimentar", url: "/falimentar", icon: Scale, description: "Recuperações e falências" },
    { title: "Blacklist", url: "/blacklist", icon: ShieldBan, description: "Restrições e bloqueios" },
  ],
};

const groups: NavGroup[] = [esteiraGroup, monitorGroup];

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
          "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          "hover:bg-white/10 hover:text-white",
          isGroupActive
            ? "text-white bg-white/15"
            : "text-white/60"
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
          <div className="bg-popover border border-border rounded-lg shadow-xl p-3 grid grid-cols-2 gap-1">
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
                    "hover:bg-accent/50",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50",
                      "bg-background group-hover/item:bg-primary/10 group-hover/item:border-primary/30",
                      isActive && "bg-primary/10 border-primary/30"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground group-hover/item:text-primary")} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">{item.title}</span>
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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mega menu on navigation
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [location.pathname]);

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
    <header className="h-12 flex items-center px-4 border-b border-navbar/20 bg-navbar text-navbar-foreground shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-6">
        <div className="h-7 w-7 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">AT</div>
        <span className="text-sm font-bold tracking-tight hidden lg:inline">Ambiente Teste</span>
      </Link>

      {/* Direct links */}
      <nav className="flex items-center gap-0.5">
        {directLinks.map((item) => {
          const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                "hover:bg-white/10 hover:text-white",
                isActive ? "text-white bg-white/15" : "text-white/60"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden xl:inline">{item.title}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="h-5 w-px bg-border mx-1.5" />

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
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch />
        <NotificationBell />
        <Link
          to="/configuracoes"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
            "hover:bg-white/10 hover:text-white",
            location.pathname.startsWith("/configuracoes")
              ? "text-white bg-white/15"
              : "text-white/60"
          )}
        >
          <Settings className="h-4 w-4" />
          <span className="hidden xl:inline">Configurações</span>
        </Link>
      </div>
    </header>
  );
}
