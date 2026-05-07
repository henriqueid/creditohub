import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Phone, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { T } from "@/lib/tokens";

type Contact = {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  department: string | null;
  is_decision_maker: boolean;
  notes: string | null;
};

interface ContactsSectionProps {
  clientId: string;
}

const empty = {
  name: "",
  email: "",
  phone: "",
  role: "",
  department: "",
  is_decision_maker: false,
  notes: "",
};

export function ContactsSection({ clientId }: ContactsSectionProps) {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["client-contacts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("client_id", clientId)
        .order("is_decision_maker", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data || []) as Contact[];
    },
    enabled: !!clientId,
  });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        client_id: clientId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        role: form.role.trim() || null,
        department: form.department.trim() || null,
        is_decision_maker: form.is_decision_maker,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast.success(editingId ? "Contato atualizado" : "Contato adicionado");
      closeDialog();
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar contato"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-contacts", clientId] });
      toast.success("Contato removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover contato"),
  });

  const openNew = () => {
    setEditingId(null);
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      role: c.role || "",
      department: c.department || "",
      is_decision_maker: !!c.is_decision_maker,
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(empty);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: 11, color: T.textMute }}>
          {contacts.length === 0 ? "Sem contatos" : `${contacts.length} contato${contacts.length > 1 ? "s" : ""}`}
        </span>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-[12px] font-medium hover:underline"
          style={{ color: T.esmeralda }}
        >
          <Plus style={{ width: 12, height: 12 }} />
          Adicionar
        </button>
      </div>

      {isLoading ? (
        <div className="py-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: T.textMute }} />
        </div>
      ) : contacts.length === 0 ? (
        <p className="py-3 text-center" style={{ fontSize: 12, color: T.textFaint }}>
          Adicione contatos comerciais, financeiros ou tomadores de decisão.
        </p>
      ) : (
        <div className="space-y-1">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="py-2 group"
              style={{ borderTop: `1px solid ${T.border}`, fontSize: 13 }}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span style={{ fontWeight: 500, color: T.text }}>{c.name}</span>
                    {c.is_decision_maker && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px]"
                        style={{
                          background: `${T.esmeralda}15`,
                          color: T.esmeralda,
                          fontSize: 10,
                          fontWeight: 600,
                        }}
                      >
                        <Star style={{ width: 9, height: 9, fill: "currentColor" }} />
                        Decisor
                      </span>
                    )}
                  </div>
                  {(c.role || c.department) && (
                    <p style={{ fontSize: 11, color: T.textMute, marginTop: 2 }}>
                      {[c.role, c.department].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {c.email && (
                      <a
                        href={`mailto:${c.email}`}
                        className="inline-flex items-center gap-1 hover:underline"
                        style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}
                      >
                        <Mail style={{ width: 10, height: 10 }} />
                        {c.email}
                      </a>
                    )}
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        className="inline-flex items-center gap-1 hover:underline"
                        style={{ fontSize: 11, color: T.textMute, fontFamily: "var(--font-mono)" }}
                      >
                        <Phone style={{ width: 10, height: 10 }} />
                        {c.phone}
                      </a>
                    )}
                  </div>
                  {c.notes && (
                    <p style={{ fontSize: 11, color: T.textFaint, marginTop: 4, fontStyle: "italic" }}>
                      {c.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1 rounded hover:bg-[#F0F1EB]"
                    title="Editar"
                  >
                    <Pencil style={{ width: 12, height: 12, color: T.textMute }} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remover contato "${c.name}"?`)) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                    className="p-1 rounded hover:bg-[#F0F1EB]"
                    title="Remover"
                  >
                    <Trash2 style={{ width: 12, height: 12, color: T.danger }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar contato" : "Adicionar contato"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cargo</Label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  placeholder="Ex: Diretor financeiro"
                />
              </div>
              <div>
                <Label>Departamento</Label>
                <Input
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                  placeholder="Ex: Financeiro"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_decision_maker}
                onChange={(e) => setForm((p) => ({ ...p, is_decision_maker: e.target.checked }))}
                className="rounded border-border"
              />
              <span className="text-sm">
                <span className="font-medium">Tomador de decisão</span>
                <span className="text-muted-foreground"> — quem aprova ou bloqueia operações</span>
              </span>
            </label>
            <div>
              <Label>Observações</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="Disponibilidade, preferências de contato..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeDialog}
                className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-colors hover:bg-[#F0F1EB]"
                style={{ border: `1px solid ${T.borderStrong}`, color: T.text }}
              >
                Cancelar
              </button>
              <button
                onClick={() => upsertMutation.mutate()}
                disabled={!form.name.trim() || upsertMutation.isPending}
                className="px-4 py-2 rounded-[8px] text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                style={{ background: T.marinho }}
              >
                {upsertMutation.isPending && <Loader2 className="animate-spin" style={{ width: 12, height: 12 }} />}
                {editingId ? "Salvar" : "Adicionar"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
