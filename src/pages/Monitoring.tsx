import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radar, Plus } from "lucide-react";

export default function Monitoring() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento</h1>
          <p className="text-muted-foreground text-sm">
            Grupos de monitoramento com alertas automáticos por CPF/CNPJ.
          </p>
        </div>
        <Button disabled>
          <Plus className="mr-2 h-4 w-4" />
          Novo Grupo
        </Button>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Radar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">Em breve</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Crie grupos de monitoramento para acompanhar CPFs/CNPJs com periodicidade
            configurável. Receba alertas por e-mail, WhatsApp ou notificação interna
            quando houver alterações relevantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
