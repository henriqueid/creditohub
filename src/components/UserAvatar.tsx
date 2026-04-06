import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Settings, History, ChevronDown } from "lucide-react";
import type { User as SupaUser } from "@supabase/supabase-js";

export function UserAvatar() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; cargo: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = (profile?.full_name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const displayName = profile?.full_name || user.email?.split("@")[0] || "Usuário";
  const displayCargo = profile?.cargo || "Sem cargo definido";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors group"
      >
        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-[11px] font-bold text-primary-foreground overflow-hidden ring-2 ring-primary/30 shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="hidden md:flex flex-col items-start text-left max-w-[120px]">
          <span className="text-xs font-semibold text-foreground truncate w-full">{displayName}</span>
          <span className="text-[10px] text-muted-foreground truncate w-full">{displayCargo}</span>
        </div>
        <ChevronDown className={`hidden md:block h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Profile header */}
          <div className="px-4 py-4 bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden ring-2 ring-primary/20 shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                {profile?.cargo && (
                  <span className="inline-block mt-1 text-[9px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {profile.cargo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <button
              onClick={() => { setOpen(false); navigate("/configuracoes"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-accent transition-colors text-left text-foreground"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Configurações
            </button>
            <button
              onClick={() => { setOpen(false); navigate("/audit-log"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-accent transition-colors text-left text-foreground"
            >
              <History className="h-4 w-4 text-muted-foreground" />
              Histórico de Alterações
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-border py-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}