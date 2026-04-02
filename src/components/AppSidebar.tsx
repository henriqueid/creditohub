import { Building2, FileText, Users, LayoutDashboard, SearchCheck, ShieldBan, Settings, UserSearch, FileBarChart, Scale, GitBranch } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

const topItems = [
  { title: "Painel Inicial", url: "/", icon: LayoutDashboard },
  { title: "Consulta CPF/CNPJ", url: "/consulta", icon: SearchCheck },
];

const esteiraItems = [
  { title: "Prospects", url: "/prospects", icon: UserSearch },
  { title: "Cedentes", url: "/cedentes", icon: Building2 },
  { title: "Análises de Crédito", url: "/analises", icon: FileText },
  { title: "Comitê de Crédito", url: "/comite", icon: Users },
];

const monitorItems = [
  { title: "Monitoramento NFs", url: "/monitoramento-nfs", icon: FileBarChart },
  { title: "Informe Falimentar", url: "/falimentar", icon: Scale },
  { title: "Blacklist", url: "/blacklist", icon: ShieldBan },
];

const bottomItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

function renderMenuItems(items: typeof topItems, collapsed: boolean) {
  return items.map((item) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === "/"}
          className="rounded-lg hover:bg-sidebar-accent/50"
          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
        >
          <item.icon className="mr-2 h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  const monitorActive = monitorItems.some((i) =>
    location.pathname.startsWith(i.url)
  );

  const esteiraActive = esteiraItems.some((i) =>
    i.url === "/" ? location.pathname === "/" : location.pathname.startsWith(i.url)
  );

  return (
    <Sidebar collapsible="icon" className="border-0">
      <SidebarContent className="bg-sidebar border-r border-sidebar-border">
        <div className="px-4 py-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">AT</div>
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">
              Ambiente Teste
            </h1>
          )}
        </div>

        {/* Top items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(topItems, collapsed)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Esteira de Crédito */}
        <SidebarGroup>
          <Collapsible defaultOpen={esteiraActive || true}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full group">
                <span className="flex items-center gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  {!collapsed && "Esteira de Crédito"}
                </span>
                {!collapsed && <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderMenuItems(esteiraItems, collapsed)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Monitoramento */}
        <SidebarGroup>
          <Collapsible defaultOpen={monitorActive || true}>
            <CollapsibleTrigger className="w-full">
              <SidebarGroupLabel className="cursor-pointer flex items-center justify-between w-full group">
                <span className="flex items-center gap-1.5">
                  <FileBarChart className="h-3.5 w-3.5" />
                  {!collapsed && "Monitoramento"}
                </span>
                {!collapsed && <ChevronRight className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-90" />}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {renderMenuItems(monitorItems, collapsed)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>

        {/* Bottom */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderMenuItems(bottomItems, collapsed)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
