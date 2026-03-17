import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background p-3 gap-3">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border bg-card overflow-hidden shadow-sm">
          <header className="h-12 flex items-center px-4 shrink-0 border-b border-border/50">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
