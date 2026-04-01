import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserSearch, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function Prospects() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Prospects</h1>
          <p className="text-muted-foreground text-sm">
            Pipeline de leads qualificados. Consulte um CPF/CNPJ para iniciar.
          </p>
        </div>
        <Button onClick={() => navigate("/consulta")}>
          <UserSearch className="mr-2 h-4 w-4" />
          Nova Consulta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <UserSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Em breve</h3>
            <p className="text-sm text-muted-foreground">
              Quando a API estiver conectada, prospects consultados aparecerão aqui
              com a pré-avaliação do motor de crédito.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/consulta")}>
              Consultar CPF/CNPJ
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
