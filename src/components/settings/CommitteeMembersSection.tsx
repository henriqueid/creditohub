import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { T } from "@/lib/tokens";
import { Plus, Trash2, Users, Loader2, ShieldCheck } from "lucide-react";

/* ── Types ────────────────────────────────────────────────────────── */

type CommitteeMemberRole = "voter" | "chair" | "observer";

type Colleague = {
  user_id: string;
  full_name: string | null;
  cargo: string | null;
  avatar_url: string | null;
};

type MemberRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  role: CommitteeMemberRole;
  active: boolean;
  created_at: string;
  profiles?: { full_name: string | null; cargo: string | null } | null;
};

const ROLE_LABEL: Record<CommitteeMemberRole, string> = {
  voter: "Votante",
  chair: "Presidente",
  observer: "Observador",
};

const ROLE_BG: Record<CommitteeMemberRole, string> = {
  voter: "rgba(0,212,154,0.10)",
  chair: "rgba(10,21,56,0.08)",
  observer: "rgba(217,163,0,0.10)",
};

const ROLE_FG: Record<CommitteeMemberRole, string> = {
  voter: T.esmeralda,
  chair: T.marinho,
  observer: T.amber,
};

/* ── Section component ─────────────────────────────────────────────── */

export default function CommitteeMembersSection() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pickedUserId, setPickedUserId] = useState<string>("");
  const [pickedRole, setPickedRole] = useState<CommitteeMemberRole>("voter");

  // Verifica se o user atual é admin (gate frontend pra esconder ações de mutação).
  const { data: isAdmin = false } = useQuery({
    queryKey: ["current-user-is-admin"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });

  // Lista membros + nome via colega (RLS restrito não permite join direto a profiles).
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["committee-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("committee_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as MemberRow[];
    },
  });

  // Usa a RPC pra carregar nomes (sem expor anthropic_api_key).
  const { data: colleagues = [] } = useQuery({
    queryKey: ["tenant-colleagues"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_tenant_colleagues");
      if (error) throw error;
      return (data || []) as Colleague[];
    },
  });

  // Index pra resolução rápida user_id → nome
  const colleagueById = new Map<string, Colleague>();
  colleagues.forEach((c) => colleagueById.set(c.user_id, c));

  // IDs já no comitê (pra esconder do select de adicionar)
  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableColleagues = colleagues.filter((c) => !memberUserIds.has(c.user_id));

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("committee_members").insert({
        user_id: pickedUserId,
        role: pickedRole,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Membro adicionado ao comitê");
      queryClient.invalidateQueries({ queryKey: ["committee-members"] });
      setDialogOpen(false);
      setPickedUserId("");
      setPickedRole("voter");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao adicionar membro"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from("committee_members")
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-members"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: CommitteeMemberRole }) => {
      const { error } = await (supabase as any)
        .from("committee_members")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-members"] });
      toast.success("Papel atualizado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar papel"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("committee_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["committee-members"] });
      toast.success("Membro removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  return (
    <div>
      <div
        className="px-6 py-5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.paper }}
      >
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: T.textFaint,
              marginBottom: 2,
            }}
          >
            COMITÊ DE CRÉDITO
          </p>
          <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
            Membros do comitê
          </p>
          <p style={{ fontSize: 12, color: T.textMute, marginTop: 4 }}>
            Defina quem participa das votações. Apenas membros ativos contam para o quórum.
          </p>
        </div>
        {isAdmin && (
        <Dialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) {
              setPickedUserId("");
              setPickedRole("voter");
            }
          }}
        >
          <DialogTrigger asChild>
            <button
              className="flex items-center gap-2 px-4 py-[8px] rounded-[999px] text-[12px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: T.marinho, color: "#FAFAF7" }}
              disabled={availableColleagues.length === 0}
            >
              <Plus style={{ width: 13, height: 13 }} />
              Adicionar membro
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar membro do comitê</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 pt-1">
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>Usuário</label>
                <Select value={pickedUserId} onValueChange={setPickedUserId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um usuário do tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColleagues.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        Nenhum usuário disponível
                      </SelectItem>
                    ) : (
                      availableColleagues.map((c) => (
                        <SelectItem key={c.user_id} value={c.user_id}>
                          {c.full_name || "Sem nome"}
                          {c.cargo ? ` · ${c.cargo}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: T.textMute }}>Papel</label>
                <Select
                  value={pickedRole}
                  onValueChange={(v) => setPickedRole(v as CommitteeMemberRole)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voter">Votante</SelectItem>
                    <SelectItem value="chair">Presidente</SelectItem>
                    <SelectItem value="observer">Observador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={() => addMutation.mutate()}
                disabled={!pickedUserId || addMutation.isPending}
                className="w-full py-[10px] rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: T.marinho, color: "#FAFAF7" }}
              >
                {addMutation.isPending ? "Adicionando..." : "Adicionar"}
              </button>
            </div>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="py-10 text-center" style={{ color: T.textMute, fontSize: 13 }}>
            <Loader2
              style={{
                width: 18,
                height: 18,
                animation: "spin 1s linear infinite",
                margin: "0 auto 8px",
                color: T.textMute,
              }}
            />
            Carregando membros...
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-14 gap-3">
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: T.cinza,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users style={{ width: 22, height: 22, color: T.textMute }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>
              Nenhum membro cadastrado
            </p>
            <p
              style={{
                fontSize: 13,
                color: T.textMute,
                textAlign: "center",
                maxWidth: 360,
              }}
            >
              Adicione usuários do seu tenant que participam das decisões do comitê.
            </p>
          </div>
        ) : (
          <div
            className="rounded-[12px] overflow-hidden"
            style={{ border: `1px solid ${T.border}`, background: T.white }}
          >
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: T.paper, borderBottom: `1px solid ${T.border}` }}>
                  <th
                    className="text-left px-4 py-2.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: T.textFaint,
                      fontWeight: 500,
                    }}
                  >
                    Membro
                  </th>
                  <th
                    className="text-left px-4 py-2.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: T.textFaint,
                      fontWeight: 500,
                    }}
                  >
                    Papel
                  </th>
                  <th
                    className="text-center px-4 py-2.5"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.10em",
                      textTransform: "uppercase",
                      color: T.textFaint,
                      fontWeight: 500,
                    }}
                  >
                    Ativo
                  </th>
                  <th className="px-4 py-2.5" style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const colleague = colleagueById.get(m.user_id);
                  const name = colleague?.full_name || "(usuário sem nome)";
                  const cargo = colleague?.cargo;
                  return (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              background: ROLE_BG[m.role],
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 600,
                              color: ROLE_FG[m.role],
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: T.text }}>
                              {name}
                            </p>
                            {cargo && (
                              <p style={{ fontSize: 11, color: T.textMute, marginTop: 1 }}>
                                {cargo}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <Select
                            value={m.role}
                            onValueChange={(v) =>
                              updateRoleMutation.mutate({
                                id: m.id,
                                role: v as CommitteeMemberRole,
                              })
                            }
                          >
                            <SelectTrigger
                              className="h-8 w-[140px] text-[12px]"
                              style={{ border: `1px solid ${T.border}` }}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="voter">Votante</SelectItem>
                              <SelectItem value="chair">Presidente</SelectItem>
                              <SelectItem value="observer">Observador</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className="px-2 py-1 rounded-full text-[11px] font-medium"
                            style={{ background: ROLE_BG[m.role], color: ROLE_FG[m.role] }}
                          >
                            {ROLE_LABEL[m.role]}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isAdmin ? (
                          <Switch
                            checked={m.active}
                            onCheckedChange={(v) =>
                              toggleActiveMutation.mutate({ id: m.id, active: v })
                            }
                          />
                        ) : (
                          <span
                            className="text-[11px]"
                            style={{
                              fontFamily: "var(--font-mono)",
                              color: m.active ? T.esmeralda : T.textMute,
                            }}
                          >
                            {m.active ? "ATIVO" : "INATIVO"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isAdmin && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="p-1.5 rounded-[6px] transition-colors hover:bg-[rgba(176,24,42,0.06)]"
                              title="Remover membro"
                              style={{ color: T.danger }}
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover {name} do comitê?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Os votos já registrados continuam
                                no histórico, mas o usuário deixa de fazer parte do quórum.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(m.id)}
                                style={{ background: T.danger, color: "#fff" }}
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="mt-4 rounded-[10px] px-4 py-3 text-[12px] flex items-start gap-2"
          style={{
            background: "rgba(10,21,56,0.04)",
            border: `1px solid ${T.border}`,
            color: T.textMute,
          }}
        >
          <ShieldCheck style={{ width: 14, height: 14, marginTop: 1, color: T.marinho, flexShrink: 0 }} />
          <span>
            <span style={{ fontWeight: 600, color: T.text }}>Como funciona:</span> ao
            registrar um voto, o sistema vincula o membro ao seu usuário (voter_id). Após
            a finalização do comitê os votos ficam travados e não podem ser editados.
          </span>
        </div>
      </div>
    </div>
  );
}
