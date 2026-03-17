import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ShieldBan, Plus, Trash2, Search, ShieldAlert, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { motion } from "framer-motion";

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

  const cpfCount = items.filter(i => i.tipo === "cpf").length;
  const cnpjCount = items.filter(i => i.tipo === "cnpj").length;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
    }),
  };

  return (
    <div className="p-6 space-y-6 overflow-auto">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blacklist</h1>
          <p className="text-muted-foreground">CPFs e CNPJs bloqueados para operações de crédito</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { title: "Total Bloqueados", value: items.length, icon: ShieldBan, colorClass: "text-destructive" },
          { title: "CPFs Bloqueados", value: cpfCount, icon: UserX, colorClass: "" },
          { title: "CNPJs Bloqueados", value: cnpjCount, icon: ShieldAlert, colorClass: "" },
        ].map((card, i) => (
          <motion.div key={card.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-3.5 w-3.5 ${card.colorClass || "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className={`text-2xl font-bold tabular-nums ${card.colorClass}`}>{card.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldBan className="h-4 w-4 text-primary" /> Documentos Bloqueados
              </CardTitle>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por CPF ou CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <ShieldBan className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {search ? "Nenhum resultado para essa busca" : "Nenhum documento na blacklist"}
                </p>
                {!search && (
                  <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Adicionar primeiro
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Adicionado por</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((item, idx) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.3 }}
                        className="border-b transition-colors hover:bg-muted/50"
                      >
                        <TableCell className="font-mono text-sm font-medium">{formatDoc(item.documento)}</TableCell>
                        <TableCell>
                          <Badge variant={item.tipo === "cpf" ? "secondary" : "outline"} className="text-[10px] uppercase tracking-wider">
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <span className="text-sm text-muted-foreground line-clamp-1">{item.motivo || "—"}</span>
                        </TableCell>
                        <TableCell className="text-sm">{item.adicionado_por || "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums text-muted-foreground">
                          {format(new Date(item.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldBan className="h-5 w-5 text-destructive" />
              Adicionar à Blacklist
            </DialogTitle>
            <DialogDescription>Informe o CPF ou CNPJ a ser bloqueado para operações de crédito.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CPF / CNPJ</Label>
              <Input
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={formatDoc(newDoc)}
                onChange={(e) => setNewDoc(cleanDoc(e.target.value).slice(0, 14))}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Motivo</Label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={newMotivo}
                onChange={(e) => setNewMotivo(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Adicionado por</Label>
              <Input
                placeholder="Nome do responsável"
                value={newAdicionadoPor}
                onChange={(e) => setNewAdicionadoPor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || cleanDoc(newDoc).length < 11}
              variant="destructive"
              className="gap-1.5"
            >
              <ShieldBan className="h-3.5 w-3.5" />
              {addMutation.isPending ? "Salvando..." : "Bloquear"}
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
