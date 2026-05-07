import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

const FREEFORM_KEY = "__freeform__";

interface ResponsibleSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Seletor de responsável comercial. Lista colegas do tenant
 * (via RPC get_tenant_colleagues) e salva o full_name canônico.
 * Aceita "Outro (digitar)" pra casos fora da equipe — armazena
 * texto livre no mesmo campo, sem coluna nova.
 */
export function ResponsibleSelect({ value, onChange, placeholder = "Selecionar responsável", className }: ResponsibleSelectProps) {
  const { data: colleagues = [] } = useQuery({
    queryKey: ["tenant-colleagues-select"],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_tenant_colleagues");
      return (data || []) as { user_id: string; full_name: string; cargo: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const colleagueNames = colleagues.map((c) => c.full_name).filter(Boolean);
  const isInList = !!value && colleagueNames.includes(value);
  const [freeform, setFreeform] = useState(!!value && !isInList);

  // Sincroniza modo livre quando o valor muda externamente
  useEffect(() => {
    if (value && !colleagueNames.includes(value)) setFreeform(true);
  }, [value, colleagueNames]);

  if (freeform) {
    return (
      <div className={className}>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nome do responsável"
        />
        <button
          type="button"
          onClick={() => { setFreeform(false); onChange(""); }}
          className="text-[11px] text-muted-foreground hover:text-foreground mt-1"
        >
          ← Voltar para selecionar da equipe
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => {
        if (v === FREEFORM_KEY) {
          setFreeform(true);
          onChange("");
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {colleagues.length === 0 ? (
          <SelectItem value={FREEFORM_KEY}>Outro (digitar nome)</SelectItem>
        ) : (
          <>
            {colleagues.map((c) => (
              <SelectItem key={c.user_id} value={c.full_name}>
                {c.full_name}
                {c.cargo && <span className="text-muted-foreground ml-2 text-xs">· {c.cargo}</span>}
              </SelectItem>
            ))}
            <SelectItem value={FREEFORM_KEY}>+ Outro (digitar nome)</SelectItem>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
