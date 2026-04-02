import { Building2, FileText, Users, LayoutDashboard, SearchCheck, ShieldBan, Settings, Radar, UserSearch, FileBarChart, Scale, Plug } from "lucide-react";
import { NavLink } from "@/components/NavLink";
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

const menuItems = [
  { title: "Painel Inicial", url: "/", icon: LayoutDashboard },
  { title: "Consulta CPF/CNPJ", url: "/consulta", icon: SearchCheck },
  { title: "Prospects", url: "/prospects", icon: UserSearch },
  { title: "Cedentes", url: "/cedentes", icon: Building2 },
  { title: "Análises de Crédito", url: "/analises", icon: FileText },
  { title: "Comitê de Crédito", url: "/comite", icon: Users },
  { title: "Monitoramento NFs", url: "/monitoramento-nfs", icon: FileBarChart },
  { title: "Informe Falimentar", url: "/falimentar", icon: Scale },
  { title: "Blacklist", url: "/blacklist", icon: ShieldBan },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
