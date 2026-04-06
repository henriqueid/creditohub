import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, FileText, Users, AlertTriangle, Scale, History, Plus, Pencil, Trash2, ShieldBan, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  icon: React.ElementType;
  label: string;
  description: string;
  time?: string;
  href: string;
  type: "warning" | "info" | "action" | "audit";
}

const TABLE_LABELS: Record<string, string> = {
  credit_analysis: "Análise de Crédito",
  blacklist: "Blacklist",
  credit_engine_rules: "Motor de Crédito",
  system_settings: "Configurações",
  committee_result: "Resultado Comitê",
  monitoring_groups: "Grupo Monitoramento",
};

const ACTION_LABELS: Record<string, string> = {
  insert: "criado",
  update: "alterado",
  delete: "excluído",
};

const CRITICAL_TABLES = ["credit_analysis", "blacklist", "committee_result", "credit_engine_rules"];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [auditAlerts, setAuditAlerts] = useState<NotificationItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

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

  const { data: overdueTasks = 0 } = useQuery({
    queryKey: ["notif-overdue-tasks"],
    queryFn: async () => {
      const { count } = await supabase
        .from("crm_tasks")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress"])
        .lt("due_date", new Date().toISOString());
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Realtime subscription for audit_log
  useEffect(() => {
    const channel = supabase
      .channel("audit-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;

          const tableName = TABLE_LABELS[row.table_name] || row.table_name;
          const actionLabel = ACTION_LABELS[row.action] || row.action;
          const isCritical = CRITICAL_TABLES.includes(row.table_name);

          // Get a meaningful record name
          const data = row.new_data || row.old_data;
          const recordName = data?.razao_social || data?.rule_name || data?.name || data?.documento || data?.key || data?.decisao_final || "";

          const label = `${tableName} ${actionLabel}`;
          const description = recordName ? `"${recordName}"` : `Registro ${row.record_id?.slice(0, 8)}`;

          // Critical changes only show in the bell dropdown, no toast

          // Add to audit alerts (keep last 10)
          const actionIconMap: Record<string, React.ElementType> = {
            insert: Plus,
            update: Pencil,
            delete: Trash2,
          };

          const newAlert: NotificationItem = {
            id: `audit-${row.id}`,
            icon: row.table_name === "blacklist" ? ShieldBan : (actionIconMap[row.action] || History),
            label,
            description,
            time: new Date().toISOString(),
            href: "/audit-log",
            type: "audit",
          };

          setAuditAlerts(prev => [newAlert, ...prev].slice(0, 10));

          // Invalidate relevant queries
          qc.invalidateQueries({ queryKey: ["audit-log"] });
          if (row.table_name === "credit_analysis") {
            qc.invalidateQueries({ queryKey: ["notif-committee"] });
            qc.invalidateQueries({ queryKey: ["notif-drafts"] });
          }
          if (row.table_name === "blacklist") {
            qc.invalidateQueries({ queryKey: ["blacklist"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, qc]);

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

  if (overdueTasks > 0) {
    notifications.push({
      id: "overdue-tasks",
      icon: CheckSquare,
      label: `${overdueTasks} tarefa${overdueTasks > 1 ? "s" : ""} atrasada${overdueTasks > 1 ? "s" : ""}`,
      description: "Tarefas do CRM com prazo vencido",
      href: "/crm/tarefas",
      type: "warning",
    });
  }

  // Merge audit alerts
  const allNotifications = [...notifications, ...auditAlerts];
  const totalCount = pendingCommittee + draftAnalyses + invalidInvoices + activeBankruptcies + overdueTasks + auditAlerts.length;

  const typeColors: Record<string, string> = {
    warning: "text-status-warning",
    action: "text-primary",
    info: "text-muted-foreground",
    audit: "text-status-committee",
  };

  const dismissAudit = useCallback(() => {
    setAuditAlerts([]);
  }, []);

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
          <span className={cn(
            "absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold",
            auditAlerts.length > 0
              ? "bg-status-committee text-white animate-pulse"
              : "bg-destructive text-destructive-foreground"
          )}>
            {totalCount > 99 ? "99+" : totalCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-[380px]">
          <div className="bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {totalCount > 0
                    ? `${totalCount} item${totalCount > 1 ? "ns" : ""} requer${totalCount > 1 ? "em" : ""} atenção`
                    : "Nenhuma pendência no momento"}
                </p>
              </div>
              {auditAlerts.length > 0 && (
                <button
                  onClick={dismissAudit}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted/50"
                >
                  Limpar recentes
                </button>
              )}
            </div>

            {allNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Tudo em dia!</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto">
                {/* Pending items */}
                {notifications.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-muted/30">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pendências</span>
                    </div>
                    {notifications.map((n) => (
                      <NotificationRow key={n.id} item={n} typeColors={typeColors} onNavigate={(href) => { setOpen(false); navigate(href); }} />
                    ))}
                  </>
                )}

                {/* Realtime audit alerts */}
                {auditAlerts.length > 0 && (
                  <>
                    <div className="px-4 py-1.5 bg-muted/30">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-status-committee animate-pulse" />
                        Alterações Recentes
                      </span>
                    </div>
                    {auditAlerts.map((n) => (
                      <NotificationRow key={n.id} item={n} typeColors={typeColors} onNavigate={(href) => { setOpen(false); navigate(href); }} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item, typeColors, onNavigate }: {
  item: NotificationItem;
  typeColors: Record<string, string>;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      onClick={() => onNavigate(item.href)}
      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border/30 last:border-0"
    >
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background",
          typeColors[item.type]
        )}
      >
        <item.icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight text-foreground">{item.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
      </div>
    </button>
  );
}
