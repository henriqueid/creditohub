import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-[10px] font-bold text-white transition-colors overflow-hidden"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-3 border-b border-border">
            <p className="text-sm font-medium truncate">{profile?.full_name || user.email}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            {profile?.cargo && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{profile.cargo}</p>
            )}
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); navigate("/configuracoes"); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent transition-colors text-left"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Configurações
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-destructive/10 text-destructive transition-colors text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
