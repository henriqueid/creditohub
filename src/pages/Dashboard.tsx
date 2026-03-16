import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Users, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count } = await supabase.from("clients").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: analysisCount = 0 } = useQuery({
    queryKey: ["analysis-count"],
    queryFn: async () => {
      const { count } = await supabase.from("credit_analysis").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: committeeCount = 0 } = useQuery({
    queryKey: ["committee-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("credit_analysis")
        .select("*", { count: "exact", head: true })
        .eq("status", "in_committee");
      return count ?? 0;
    },
  });

  const { data: approvedCount = 0 } = useQuery({
    queryKey: ["approved-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("credit_analysis")
        .select("*", { count: "exact", head: true })
        .in("status", ["approved", "approved_restricted"]);
      return count ?? 0;
    },
  });

  const cards = [
    { title: "Cedentes", value: clientCount, icon: Building2, href: "/cedentes" },
    { title: "Análises", value: analysisCount, icon: FileText, href: "/analises" },
    { title: "Em Comitê", value: committeeCount, icon: Users, href: "/comite" },
    { title: "Aprovados", value: approvedCount, icon: CheckCircle, href: "/analises" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do módulo de crédito</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.href)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
