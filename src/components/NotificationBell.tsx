import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, FileText, Users, AlertTriangle, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationItem {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  time?: string;
  href: string;
  type: "warning" | "info" | "action";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: pendingCommittee = 0 } = useQuery({
    queryKey: ["notif-committee"],
    queryFn: async () => {
      const { count } = await supabase
        .from("credit_analysis")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_committee");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: draftAnalyses = 0 } = useQuery({
    queryKey: ["notif-drafts"],
    queryFn: async () => {
      const { count } = await supabase
        .from("credit_analysis")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: activeBankruptcies = 0 } = useQuery({
    queryKey: ["notif-bankruptcies"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bankruptcy_records")
        .select("*", { count: "exact", head: true })
        .in("status", ["active", "monitoring"]);
      return count || 0;
    },
    refetchInterval: 60000,
  });

  const { data: invalidInvoices = 0 } = useQuery({
    queryKey: ["notif-invoices"],
    queryFn: async () => {
      const { count } = await supabase
        .from("monitored_invoices")
        .select("*", { count: "exact", head: true })
        .eq("validation_status", "invalid");
      return count || 0;
    },
    refetchInterval: 60000,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const notifications: NotificationItem[] = [];

  if (pendingCommittee > 0) {
    notifications.push({
      id: "committee",
      icon: Users,
      label: `${pendingCommittee} análise${pendingCommittee > 1 ? "s" : ""} em comitê`,
      description: "Aguardando votação do comitê de crédito",
      href: "/comite",
      type: "action",
    });
  }

  if (draftAnalyses > 0) {
    notifications.push({
      id: "drafts",
      icon: FileText,
      label: `${draftAnalyses} rascunho${draftAnalyses > 1 ? "s" : ""} pendente${draftAnalyses > 1 ? "s" : ""}`,
      description: "Análises de crédito em elaboração",
      href: "/analises",
      type: "info",
    });
  }

  if (invalidInvoices > 0) {
    notifications.push({
      id: "invoices",
      icon: AlertTriangle,
      label: `${invalidInvoices} NF${invalidInvoices > 1 ? "s" : ""} inválida${invalidInvoices > 1 ? "s" : ""}`,
      description: "Notas fiscais com problemas de validação",
      href: "/monitoramento-nfs",
      type: "warning",
    });
  }

  if (activeBankruptcies > 0) {
    notifications.push({
      id: "bankruptcies",
      icon: Scale,
      label: `${activeBankruptcies} registro${activeBankruptcies > 1 ? "s" : ""} falimentar${activeBankruptcies > 1 ? "es" : ""}`,
      description: "Registros ativos de recuperação/falência",
      href: "/falimentar",
      type: "warning",
    });
  }

  const totalCount = pendingCommittee + draftAnalyses + invalidInvoices + activeBankruptcies;

  const typeColors: Record<string, string> = {
    warning: "text-status-warning",
    action: "text-primary",
    info: "text-muted-foreground",
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "relative flex items-center justify-center h-8 w-8 rounded-md transition-colors",
          "hover:bg-accent/10 text-muted-foreground hover:text-accent-foreground",
          open && "bg-accent/10 text-accent-foreground"
        )}
      >
        <Bell className="h-4 w-4" />
        {totalCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[360px]">
          <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <h3 className="text-sm font-semibold">Notificações</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalCount > 0
                  ? `${totalCount} item${totalCount > 1 ? "ns" : ""} requer${totalCount > 1 ? "em" : ""} atenção`
                  : "Nenhuma pendência no momento"}
              </p>
            </div>

            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Tudo em dia!</p>
              </div>
            ) : (
              <div className="max-h-[320px] overflow-y-auto">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => {
                      setOpen(false);
                      navigate(n.href);
                    }}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
                  >
                    <div
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background",
                        typeColors[n.type]
                      )}
                    >
                      <n.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{n.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
