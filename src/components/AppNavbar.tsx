import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  LogOut, User as UserIcon, Settings, Bell, ChevronDown,
  LayoutGrid, Workflow, Users, Activity, CheckSquare,
  BarChart3, Scale, Building2, Search, Ban, Sparkles, Menu, X as XIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ── Logo SVG ───────────────────────────────────────────────────── */

function Logo() {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg width="22" height="22" viewBox="0 0 64 64" style={{ display: "block", flexShrink: 0 }}>
        <rect x="6" y="20" width="52" height="6" rx="3" fill="#FAFAF7" />
        <rect x="6" y="38" width="52" height="6" rx="3" fill="#FAFAF7" />
        <circle cx="46" cy="32" r="7" fill="#00D49A" />
      </svg>
      <span
        className="font-medium text-[15px] text-[#FAFAF7]"
        style={{ letterSpacing: "-0.03em" }}
      >
        Trilho<span style={{ color: "#00D49A" }}>.</span>
      </span>
    </span>
  );
}

/* ── Módulos ────────────────────────────────────────────────────── */

const MODULES = [
  { label: "Painel",        path: "/" },
  { label: "Comercial",     path: "/crm/dashboard" },
  { label: "Crédito",       path: "/analises" },
  { label: "Monitoramento", path: "/monitoramento-nfs" },
] as const;

type SubNavItem = { label: string; path: string; icon: LucideIcon };

const CRM_SUBNAV: SubNavItem[] = [
  { label: "Dashboard",   path: "/crm/dashboard",  icon: LayoutGrid },
  { label: "Consulta",    path: "/consulta",       icon: Search },
  { label: "Prospects",   path: "/prospects",      icon: Sparkles },
  { label: "Pipeline",    path: "/crm/pipeline",   icon: Workflow },
  { label: "Contatos",    path: "/crm/contatos",   icon: Users },
  { label: "Atividades",  path: "/crm/atividades", icon: Activity },
  { label: "Tarefas",     path: "/crm/tarefas",    icon: CheckSquare },
];

const CREDITO_SUBNAV: SubNavItem[] = [
  { label: "Análises",    path: "/analises",  icon: BarChart3 },
  { label: "Comitê",      path: "/comite",    icon: Scale },
  { label: "Portfólio",   path: "/cedentes",  icon: Building2 },
  { label: "Blacklist",   path: "/blacklist", icon: Ban },
];

function getActiveModule(pathname: string): string {
  if (pathname === "/") return "Painel";
  if (
    pathname.startsWith("/crm") ||
    pathname.startsWith("/consulta") ||
    pathname.startsWith("/prospects")
  ) return "Comercial";
  if (
    pathname.startsWith("/analises") ||
    pathname.startsWith("/comite") ||
    pathname.startsWith("/cedentes") ||
    pathname.startsWith("/blacklist") ||
    pathname.startsWith("/falimentar")
  ) return "Crédito";
  if (
    pathname.startsWith("/monitoramento") ||
    pathname.startsWith("/performance")
  ) return "Monitoramento";
  return "";
}

/* ── SubNav ─────────────────────────────────────────────────────── */

function SubNav({
  items,
  pathname,
  navigate,
}: {
  items: SubNavItem[];
  pathname: string;
  navigate: (path: string) => void;
}) {
  return (
    <div
      className="flex items-center px-3 sm:px-6 flex-shrink-0 overflow-x-auto"
      style={{
        height: 44,
        background: "rgba(8,17,46,0.96)",
        borderBottom: "1px solid rgba(0,212,154,0.10)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        fontFamily: "var(--font-sans)",
        scrollbarWidth: "none",
      }}
    >
      <nav className="flex items-center gap-1 relative">
        {items.map(({ label, path, icon: Icon }) => {
          const isActive = pathname === path || (path !== "/" && pathname.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-[7px] rounded-[8px] text-[12.5px] transition-colors duration-150 whitespace-nowrap z-10",
                isActive
                  ? "text-[#0A1538] font-semibold"
                  : "text-[rgba(250,250,247,0.78)] hover:text-[#FAFAF7] hover:bg-[rgba(255,255,255,0.08)]"
              )}
              style={{ letterSpacing: "-0.005em" }}
            >
              {isActive && (
                <motion.span
                  layoutId="subnav-active-pill"
                  className="absolute inset-0 rounded-[8px] -z-10"
                  style={{
                    background: "#00D49A",
                    boxShadow: "0 4px 14px -4px rgba(0,212,154,0.55), 0 0 0 1px rgba(0,212,154,0.85) inset",
                  }}
                  transition={{ type: "spring", stiffness: 700, damping: 38 }}
                />
              )}
              <Icon style={{ width: 13.5, height: 13.5, flexShrink: 0 }} strokeWidth={2.2} />
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Notifications Dropdown ─────────────────────────────────────── */

interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  path?: string;  // rota pra abrir ao clicar
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: "1", title: "Análise aprovada", body: "Empresa XYZ aprovada com limite R$ 50k", time: "há 5min", unread: true,  path: "/analises" },
  { id: "2", title: "Comitê pendente",  body: "3 análises aguardam votação no comitê",  time: "há 1h",  unread: true,  path: "/comite" },
  { id: "3", title: "Deal criado",      body: "Novo deal criado para Empresa ABC",       time: "há 2h",  unread: false, path: "/crm/pipeline" },
];

function NotificationsDropdown({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => n.unread).length;

  function handleClickNotification(n: Notification) {
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
    setOpen(false);
    if (n.path) navigate(n.path);
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-[8px] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
        style={{ color: "rgba(250,250,247,0.7)" }}
      >
        <Bell style={{ width: 18, height: 18 }} />
        {unreadCount > 0 && (
          <span
            className="absolute top-[5px] right-[5px] flex items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              width: 15, height: 15,
              background: "#00D49A",
              color: "#0A1538",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 320, background: "#FBFBF7",
            border: "1px solid rgba(10,21,56,0.12)",
            borderRadius: 14, boxShadow: "var(--shadow-lg)",
            zIndex: 100, overflow: "hidden",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(10,21,56,0.08)" }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0A1538" }}>Notificações</span>
            {unreadCount > 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#00D49A" }}>
                {unreadCount} não lidas
              </span>
            )}
          </div>
          <div>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center" style={{ fontSize: 12, color: "rgba(10,21,56,0.45)" }}>
                Sem notificações
              </div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className="w-full flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[rgba(10,21,56,0.04)] text-left"
                  style={{ borderBottom: "1px solid rgba(10,21,56,0.05)", background: "transparent", border: "none", borderLeft: "3px solid", borderLeftColor: n.unread ? "#00D49A" : "transparent" }}
                >
                  <div
                    style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5,
                      background: n.unread ? "#00D49A" : "rgba(10,21,56,0.15)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: 13, fontWeight: n.unread ? 600 : 400, color: "#0A1538", marginBottom: 1 }}>
                      {n.title}
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(10,21,56,0.55)", lineHeight: 1.4 }}>{n.body}</p>
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,21,56,0.35)", marginTop: 4 }}>{n.time}</p>
                  </div>
                </button>
              ))
            )}
          </div>
          {unreadCount > 0 && (
            <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(10,21,56,0.06)" }}>
              <button
                onClick={markAllRead}
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#00D49A", background: "none", border: "none", cursor: "pointer" }}
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── User Dropdown ───────────────────────────────────────────────── */

function UserDropdown({ user, navigate }: { user: User | null; navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "??";
  const email = user?.email ?? "";
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split("@")[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-[8px] px-2 py-1 transition-colors hover:bg-[rgba(255,255,255,0.08)]"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
          style={{ background: "rgba(0,212,154,0.25)", color: "#FAFAF7" }}
        >
          {initials}
        </div>
        <ChevronDown
          style={{
            width: 13, height: 13,
            color: "rgba(250,250,247,0.5)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 220, background: "#FBFBF7",
            border: "1px solid rgba(10,21,56,0.12)",
            borderRadius: 14, boxShadow: "var(--shadow-lg)",
            zIndex: 100, overflow: "hidden",
          }}
        >
          {/* User info */}
          <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(10,21,56,0.08)" }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold mb-2"
              style={{ background: "rgba(0,212,154,0.15)", color: "#0A1538" }}
            >
              {initials}
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#0A1538", lineHeight: 1.2 }}>{name}</p>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(10,21,56,0.45)", marginTop: 2 }}>{email}</p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <button
              onClick={() => { navigate("/configuracoes"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(10,21,56,0.04)] text-left"
              style={{ color: "#0A1538" }}
            >
              <Settings style={{ width: 14, height: 14, opacity: 0.5 }} />
              Configurações
            </button>
            <button
              onClick={() => { navigate("/perfil"); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(10,21,56,0.04)] text-left"
              style={{ color: "#0A1538" }}
            >
              <UserIcon style={{ width: 14, height: 14, opacity: 0.5 }} />
              Meu perfil
            </button>
          </div>

          <div style={{ borderTop: "1px solid rgba(10,21,56,0.07)" }} className="py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-[rgba(176,24,42,0.05)] text-left"
              style={{ color: "#B0182A" }}
            >
              <LogOut style={{ width: 14, height: 14 }} />
              Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Mobile Drawer ──────────────────────────────────────────────── */

function MobileDrawer({
  open,
  onClose,
  activeModule,
  navigate,
}: {
  open: boolean;
  onClose: () => void;
  activeModule: string;
  navigate: (path: string) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] lg:hidden"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <aside
        className="absolute top-0 left-0 h-full w-[280px] flex flex-col"
        style={{ background: "var(--marinho)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <Logo />
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10" style={{ color: "rgba(250,250,247,0.7)" }}>
            <XIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        <nav className="flex flex-col p-3 gap-1">
          {MODULES.map(({ label, path }) => {
            const isActive = activeModule === label;
            return (
              <button
                key={label}
                onClick={() => { navigate(path); onClose(); }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-[10px] text-[14px] font-medium transition-colors",
                  isActive
                    ? "bg-[rgba(250,250,247,0.13)] text-[#FAFAF7] border border-[rgba(250,250,247,0.18)]"
                    : "text-[rgba(250,250,247,0.7)] hover:bg-[rgba(255,255,255,0.06)] border border-transparent"
                )}
              >
                {label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => { navigate("/consulta"); onClose(); }}
            className="w-full flex items-center justify-center gap-1.5 py-[10px] rounded-[999px] text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ background: "#00D49A", color: "#0A1538" }}
          >
            + Nova Consulta
          </button>
        </div>
      </aside>
    </div>
  );
}

/* ── Topbar ─────────────────────────────────────────────────────── */

export function AppNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeModule = getActiveModule(location.pathname);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const subNav =
    activeModule === "Comercial" ? CRM_SUBNAV :
    activeModule === "Crédito"   ? CREDITO_SUBNAV :
    null;

  return (
    <>
      <header
        className="flex items-center gap-3 lg:gap-6 px-3 sm:px-6 flex-shrink-0"
        style={{
          height: "var(--topbar-height)",
          background: "var(--marinho)",
          fontFamily: "var(--font-sans)",
        }}
      >
        {/* Hamburger (mobile/tablet) */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden p-2 rounded-[8px] transition-colors hover:bg-[rgba(255,255,255,0.08)]"
          style={{ color: "rgba(250,250,247,0.85)" }}
          aria-label="Abrir menu"
        >
          <Menu style={{ width: 20, height: 20 }} />
        </button>

        {/* Logo → Painel */}
        <button onClick={() => navigate("/")} className="flex-shrink-0 hover:opacity-85 transition-opacity">
          <Logo />
        </button>

        {/* Módulos — só lg+ */}
        <nav className="hidden lg:flex items-center gap-1 ml-1">
          {MODULES.map(({ label, path }) => {
            const isActive = activeModule === label;
            return (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={cn(
                  "px-[14px] py-2 rounded-[999px] text-[13px] font-medium transition-all duration-200 whitespace-nowrap",
                  isActive
                    ? "bg-[rgba(250,250,247,0.13)] text-[#FAFAF7] border border-[rgba(250,250,247,0.18)]"
                    : "text-[rgba(250,250,247,0.62)] hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(250,250,247,0.85)] border border-transparent"
                )}
              >
                {label}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search — só md+ */}
        <button
          className="hidden md:flex items-center gap-2 px-[14px] py-2 rounded-[999px] text-[12px] text-[rgba(250,250,247,0.52)] transition-colors hover:bg-[rgba(255,255,255,0.1)]"
          style={{ background: "rgba(255,255,255,0.06)", minWidth: 200 }}
          onClick={() => navigate("/consulta")}
        >
          <span style={{ opacity: 0.6, fontSize: 15 }}>⌕</span>
          <span>Buscar cedente, NF, análise…</span>
          <span
            className="ml-auto font-mono text-[10px] px-[6px] py-[1px] rounded"
            style={{ border: "1px solid rgba(255,255,255,0.16)" }}
          >
            ⌘K
          </span>
        </button>

        {/* Nova Consulta — só sm+ */}
        <button
          onClick={() => navigate("/consulta")}
          className="hidden sm:flex items-center gap-1.5 px-[14px] py-[8px] rounded-[999px] text-[13px] font-medium flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ background: "#00D49A", color: "#0A1538" }}
        >
          + Nova Consulta
        </button>

        {/* Notifications */}
        <NotificationsDropdown navigate={navigate} />

        {/* User */}
        <UserDropdown user={user} navigate={navigate} />
      </header>

      {/* Mobile drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeModule={activeModule}
        navigate={navigate}
      />

      {/* Sub-nav condicional */}
      {subNav && (
        <SubNav items={subNav} pathname={location.pathname} navigate={navigate} />
      )}
    </>
  );
}
