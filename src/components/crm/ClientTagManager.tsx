import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, X, Tag, Check } from "lucide-react";
import { toast } from "sonner";

const TAG_COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6",
  "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#64748b",
];

interface ClientTagManagerProps {
  clientId: string;
  compact?: boolean;
}

export function ClientTagManager({ clientId, compact = false }: ClientTagManagerProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: clientTagIds = [] } = useQuery({
    queryKey: ["client-tags", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tags")
        .select("tag_id")
        .eq("client_id", clientId);
      if (error) throw error;
      return data.map((ct) => ct.tag_id);
    },
  });

  const assignedTags = allTags.filter((t) => clientTagIds.includes(t.id));

  const toggleTag = useMutation({
    mutationFn: async (tagId: string) => {
      const isAssigned = clientTagIds.includes(tagId);
      if (isAssigned) {
        const { error } = await supabase
          .from("client_tags")
          .delete()
          .eq("client_id", clientId)
          .eq("tag_id", tagId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("client_tags")
          .insert({ client_id: clientId, tag_id: tagId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-tags", clientId] });
      queryClient.invalidateQueries({ queryKey: ["all-client-tags"] });
    },
  });

  const createTag = useMutation({
    mutationFn: async () => {
      if (!newTagName.trim()) return;
      const { data, error } = await supabase
        .from("tags")
        .insert({ name: newTagName.trim(), color: newTagColor })
        .select()
        .single();
      if (error) throw error;
      // Auto-assign to current client
      await supabase.from("client_tags").insert({ client_id: clientId, tag_id: data.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["client-tags", clientId] });
      queryClient.invalidateQueries({ queryKey: ["all-client-tags"] });
      setNewTagName("");
      toast.success("Tag criada!");
    },
  });

  const deleteTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["client-tags"] });
      queryClient.invalidateQueries({ queryKey: ["all-client-tags"] });
      toast.success("Tag removida");
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-1">
      {assignedTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className="text-[10px] px-1.5 py-0 gap-0.5 border-0"
          style={{ backgroundColor: tag.color + "20", color: tag.color }}
        >
          {tag.name}
          {!compact && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleTag.mutate(tag.id); }}
              className="ml-0.5 hover:opacity-70"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center h-4 w-4 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Tag className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-medium mb-2 px-1">Tags</p>
          <div className="space-y-0.5 max-h-40 overflow-y-auto">
            {allTags.map((tag) => {
              const isAssigned = clientTagIds.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between px-1.5 py-1 rounded hover:bg-muted cursor-pointer group"
                  onClick={() => toggleTag.mutate(tag.id)}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-xs">{tag.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isAssigned && <Check className="h-3 w-3 text-primary" />}
                    <button
                      className="h-4 w-4 items-center justify-center rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive hidden group-hover:inline-flex"
                      onClick={(e) => { e.stopPropagation(); deleteTag.mutate(tag.id); }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t mt-2 pt-2 space-y-1.5">
            <Input
              placeholder="Nova tag..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="h-7 text-xs"
              onKeyDown={(e) => e.key === "Enter" && createTag.mutate()}
            />
            <div className="flex items-center gap-1">
              {TAG_COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-4 w-4 rounded-full transition-all ${newTagColor === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewTagColor(c)}
                />
              ))}
            </div>
            <Button size="sm" className="w-full h-7 text-xs" disabled={!newTagName.trim()} onClick={() => createTag.mutate()}>
              <Plus className="h-3 w-3 mr-1" /> Criar Tag
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Standalone filter component
export function TagFilter({
  selectedTags,
  onChange,
}: {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}) {
  const { data: allTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  if (allTags.length === 0) return null;

  const toggle = (id: string) => {
    onChange(
      selectedTags.includes(id)
        ? selectedTags.filter((t) => t !== id)
        : [...selectedTags, id]
    );
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      {allTags.map((tag) => {
        const active = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => toggle(tag.id)}
            className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border transition-all ${
              active
                ? "border-transparent font-medium"
                : "border-border bg-background hover:bg-muted"
            }`}
            style={active ? { backgroundColor: tag.color + "25", color: tag.color, borderColor: tag.color + "40" } : {}}
          >
            <span className="h-2 w-2 rounded-full mr-1 shrink-0" style={{ backgroundColor: tag.color }} />
            {tag.name}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button onClick={() => onChange([])} className="text-[10px] text-muted-foreground hover:text-foreground underline">
          Limpar
        </button>
      )}
    </div>
  );
}

// Hook to get all client-tag associations in one query
export function useAllClientTags() {
  return useQuery({
    queryKey: ["all-client-tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_tags")
        .select("client_id, tag_id, tags(id, name, color)");
      if (error) throw error;
      const map: Record<string, { id: string; name: string; color: string }[]> = {};
      data.forEach((ct: any) => {
        if (!ct.tags) return;
        if (!map[ct.client_id]) map[ct.client_id] = [];
        map[ct.client_id].push({ id: ct.tags.id, name: ct.tags.name, color: ct.tags.color });
      });
      return map;
    },
  });
}
