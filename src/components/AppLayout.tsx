import { AppNavbar } from "@/components/AppNavbar";
import { AppBreadcrumbs } from "@/components/AppBreadcrumbs";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div
      className="min-h-screen flex flex-col w-full"
      style={{ background: "var(--off)" }}
    >
      <AppNavbar />
      <AppBreadcrumbs />
      <main
        className="flex-1 overflow-auto"
        style={{ background: "var(--off)" }}
      >
        <Outlet />
      </main>
    </div>
  );
}
