import { Building2, FileText, Users, LayoutDashboard, SearchCheck, ShieldBan, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import logoSink from "@/assets/logo-sink.png";
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
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Consulta CPF/CNPJ", url: "/consulta", icon: SearchCheck },
  { title: "Cedentes", url: "/cedentes", icon: Building2 },
  { title: "Análises de Crédito", url: "/analises", icon: FileText },
  { title: "Comitê de Crédito", url: "/comite", icon: Users },
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
          <img src={logoSink} alt="Sink Logo" className="h-8 w-8 rounded" />
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">
              Sink
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
