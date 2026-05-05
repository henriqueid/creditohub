import {
  Building2,
  FileText,
  Users,
  LayoutDashboard,
  SearchCheck,
  ShieldBan,
  Settings,
  UserSearch,
  FileBarChart,
  Scale,
  ChevronRight,
  CreditCard,
  TrendingUp,
  Filter,
  Contact,
  MessageSquare,
  CheckSquare,
  Receipt,
  Gauge,
  Eye,
  Plug,
  Landmark,
  Handshake,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/* ── Estrutura de navegação ─────────────────────────────────────── */

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
}

const topItems: NavItem[] = [
  { title: "Painel Inicial", url: "/", icon: LayoutDashboard },
  { title: "Consulta CPF/CNPJ", url: "/consulta", icon: SearchCheck },
];

const groups: NavGroup[] = [
  {
    id: "comercial",
    title: "Comercial",
    icon: Handshake,
    items: [
      { title: "Dashboard CRM", url: "/crm/dashboard", icon: TrendingUp },
      { title: "Pipeline", url: "/crm/pipeline", icon: Filter },
      { title: "Prospects", url: "/prospects", icon: UserSearch },
      { title: "Contatos", url: "/crm/contatos", icon: Contact },
      { title: "Atividades", url: "/crm/atividades", icon: MessageSquare },
      { title: "Tarefas", url: "/crm/tarefas", icon: CheckSquare },
    ],
  },
  {
    id: "credito",
    title: "Crédito",
    icon: CreditCard,
    items: [
      { title: "Cedentes", url: "/cedentes", icon: Building2 },
      { title: "Análises de Crédito", url: "/analises", icon: FileText },
      { title: "Comitê de Crédito", url: "/comite", icon: Users },
      { title: "Patrimonial", url: "/patrimonial", icon: Landmark },
      { title: "Performance", url: "/performance", icon: Gauge },
    ],
  },
  {
    id: "monitoramento",
    title: "Monitoramento",
    icon: Eye,
    items: [
      { title: "Notas Fiscais", url: "/monitoramento-nfs", icon: Receipt },
      { title: "Informe Falimentar", url: "/falimentar", icon: Scale },
      { title: "Blacklist", url: "/blacklist", icon: ShieldBan },
      { title: "Integrações", url: "/integracoes", icon: Plug },
    ],
  },
];

const bottomItems: NavItem[] = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

/* ── Helpers ────────────────────────────────────────────────────── */

function isGroupActive(group: NavGroup, pathname: string) {
  return group.items.some((i) =>
    i.url === "/" ? pathname === "/" : pathname.startsWith(i.url)
  );
}

function isItemActive(url: string, pathname: string) {
  return url === "/" ? pathname === "/" : pathname.startsWith(url);
}

/* ── Item de menu individual ────────────────────────────────────── */

function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const active = isItemActive(item.url, location.pathname);

  const link = (
    <NavLink
      to={item.url}
      end={item.url === "/"}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-sink-sm text-[13px] font-medium transition-all duration-150",
        "text-sink-fog/80 hover:text-sink-cream hover:bg-sink-deep-3",
        active && "bg-sink-deep-3 text-white border-l-2 border-sink-mint pl-[10px]"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-sink-mint" : "text-sink-fog/60")} />
      {!collapsed && <span className="truncate">{item.title}</span>}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

/* ── Grupo colapsável ───────────────────────────────────────────── */

function SidebarGroup({
  group,
  collapsed,
  defaultOpen,
}: {
  group: NavGroup;
  collapsed: boolean;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const groupLabel = (
    <button
      onClick={() => setOpen((v) => !v)}
      className={cn(
        "w-full flex items-center justify-between px-3 py-1.5 rounded-sink-sm",
        "text-[11px] font-semibold uppercase tracking-widest transition-colors",
        "text-sink-fog/40 hover:text-sink-fog/70"
      )}
    >
      {collapsed ? (
        <group.icon className="h-3.5 w-3.5 mx-auto" />
      ) : (
        <>
          <span className="flex items-center gap-1.5">
            <group.icon className="h-3.5 w-3.5" />
            {group.title}
          </span>
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              open && "rotate-90"
            )}
          />
        </>
      )}
    </button>
  );

  return (
    <div className="px-2 mt-1">
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{groupLabel}</TooltipTrigger>
          <TooltipContent side="right" className="text-xs font-semibold uppercase tracking-wider">
            {group.title}
          </TooltipContent>
        </Tooltip>
      ) : (
        groupLabel
      )}

      <Collapsible open={!collapsed ? open : true}>
        <CollapsibleContent>
          <div className="mt-0.5 flex flex-col gap-0.5">
            {group.items.map((item) => (
              <SidebarItem key={item.url} item={item} collapsed={collapsed} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/* ── Rodapé com usuário ─────────────────────────────────────────── */

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
    cargo: string | null;
  } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, avatar_url, cargo")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  if (!user) return null;

  const initials = (profile?.full_name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Usuário";
  const displayCargo = profile?.cargo || "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div
      className={cn(
        "px-2 py-3 border-t border-sink-deep-4/60 flex items-center gap-2.5",
        collapsed ? "justify-center" : "justify-between"
      )}
    >
      {/* Avatar + info */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="h-8 w-8 rounded-full bg-sink-mint flex items-center justify-center text-[11px] font-bold text-sink-deep shrink-0 overflow-hidden ring-2 ring-sink-mint/25">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex flex-col">
            <span className="text-[13px] font-semibold text-sink-cream truncate leading-tight">
              {displayName}
            </span>
            {displayCargo && (
              <span className="text-[11px] text-sink-fog/50 truncate leading-tight">
                {displayCargo}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Logout */}
      {!collapsed ? (
        <button
          onClick={handleLogout}
          className="shrink-0 flex items-center justify-center h-7 w-7 rounded-sink-sm text-sink-fog/40 hover:text-sink-danger hover:bg-sink-danger/10 transition-colors"
          title="Sair"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center h-7 w-7 rounded-sink-sm text-sink-fog/40 hover:text-sink-danger hover:bg-sink-danger/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">Sair</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/* ── AppSidebar principal ───────────────────────────────────────── */

export function AppSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sink-deep transition-all duration-200",
        "shadow-[1px_0_0_0_rgba(24,64,74,0.6)]",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      {/* Logo / wordmark */}
      <div
        className={cn(
          "flex items-center h-14 px-4 shrink-0 border-b border-sink-deep-4/60",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="CreditoHub" className="h-7 w-7 shrink-0" />
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-white leading-none">
              Credito<span className="text-sink-mint">Hub</span>
            </span>
          )}
        </div>
      </div>

      {/* Navegação scrollável */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col gap-0.5">
        {/* Top items diretos */}
        <div className="px-2 flex flex-col gap-0.5">
          {topItems.map((item) => (
            <SidebarItem key={item.url} item={item} collapsed={collapsed} />
          ))}
        </div>

        {/* Separador */}
        <div className="mx-4 my-2 h-px bg-sink-deep-4/50" />

        {/* Grupos colapsáveis */}
        {groups.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            collapsed={collapsed}
            defaultOpen={isGroupActive(group, location.pathname)}
          />
        ))}

        {/* Separador */}
        <div className="mx-4 my-2 h-px bg-sink-deep-4/50" />

        {/* Bottom items */}
        <div className="px-2 flex flex-col gap-0.5">
          {bottomItems.map((item) => (
            <SidebarItem key={item.url} item={item} collapsed={collapsed} />
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
}
