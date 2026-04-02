import { AppNavbar } from "@/components/AppNavbar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <AppNavbar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
