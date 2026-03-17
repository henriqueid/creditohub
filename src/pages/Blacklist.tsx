import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldBan, Plus, Trash2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function cleanDoc(v: string) {
  return v.replace(/\D/g, "");
}

function formatDoc(v: string) {
  const d = cleanDoc(v);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d{3})?(\d{3})?(\d{0,2})?/, (_, a, b, c, e) =>
      [a, b, c].filter(Boolean).join(".") + (e ? `-${e}` : "")
    );
  }
  return d.replace(/(\d{2})(\d{3})?(\d{3})?(\d{4})?(\d{0,2})?/, (_, a, b, c, d2, e) =>
    [a, b, c].filter(Boolean).join(".") + (d2 ? `/${d2}` : "") + (e ? `-${e}` : "")
  );
}

export default function Blacklist() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState("");
  const [newMotivo, setNewMotivo] = useState("");
  const [newAdicionadoPor, setNewAdicionadoPor] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["blacklist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blacklist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const digits = cleanDoc(newDoc);
      if (digits.length !== 11 && digits.length !== 14) throw new Error("Documento inválido");
      const tipo = digits.length === 11 ? "cpf" : "cnpj";
      const { error } = await supabase.from("blacklist").insert({
        documento: digits,
        tipo,
        motivo: newMotivo || null,
        adicionado_por: newAdicionadoPor || null,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Documento já está na blacklist");
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blacklist"] });
      setAddOpen(false);
      setNewDoc("");
      setNewMotivo("");
      setNewAdicionadoPor("");
      toast({ title: "Adicionado à blacklist" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blacklist").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["blacklist"] });
      setDeleteId(null);
      toast({ title: "Removido da blacklist" });
    },
  });

  const filtered = items.filter((i) => {
    const q = cleanDoc(search);
    if (!q) return true;
    return i.documento.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldBan className="h-6 w-6 text-destructive" /> Blacklist
          </h1>
          <p className="text-muted-foreground text-sm">CPFs e CNPJs bloqueados para operações de crédito</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CPF ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">Nenhum registro encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Adicionado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{formatDoc(item.documento)}</TableCell>
                    <TableCell>
                      <Badge variant={item.tipo === "cpf" ? "secondary" : "outline"}>
                        {item.tipo.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{item.motivo || "—"}</TableCell>
                    <TableCell>{item.adicionado_por || "—"}</TableCell>
                    <TableCell>{format(new Date(item.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar à Blacklist</DialogTitle>
            <DialogDescription>Informe o CPF ou CNPJ a ser bloqueado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={formatDoc(newDoc)}
                onChange={(e) => setNewDoc(cleanDoc(e.target.value).slice(0, 14))}
              />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                placeholder="Motivo do bloqueio..."
                value={newMotivo}
                onChange={(e) => setNewMotivo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Adicionado por</Label>
              <Input
                placeholder="Nome do responsável"
                value={newAdicionadoPor}
                onChange={(e) => setNewAdicionadoPor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
              {addMutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da blacklist?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação permitirá que o documento volte a ser utilizado em operações de crédito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
