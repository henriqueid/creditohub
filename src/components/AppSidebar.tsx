import { Building2, FileText, Users, LayoutDashboard, SearchCheck, ShieldBan, Settings } from "lucide-react";
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
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="glass-sidebar">
      <SidebarContent className="backdrop-blur-2xl bg-sidebar-background/80 border-r border-white/[0.08]">
        <div className="px-4 py-5">
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight text-sidebar-primary-foreground">
              Crédito<span className="text-sidebar-primary">Hub</span>
            </h1>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="rounded-lg transition-all duration-200 hover:bg-white/[0.08] hover:backdrop-blur-sm"
                      activeClassName="bg-white/[0.12] text-sidebar-primary font-medium shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
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
