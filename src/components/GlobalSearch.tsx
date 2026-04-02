import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, FileText, X, Loader2, Scale, ShieldBan } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/StatusBadge";

interface SearchResult {
  id: string;
  type: "client" | "analysis" | "bankruptcy" | "blacklist";
  title: string;
  subtitle: string;
  status?: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const searchTerm = `%${term}%`;

      const [clientsRes, analysesRes, bankruptcyRes, blacklistRes] = await Promise.all([
        supabase
          .from("clients")
          .select("id, razao_social, nome_fantasia, cnpj_cpf, cidade, estado")
          .or(`razao_social.ilike.${searchTerm},nome_fantasia.ilike.${searchTerm},cnpj_cpf.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("credit_analysis")
          .select("id, status, credit_score, created_at, analista_credito, clients(razao_social, cnpj_cpf)")
          .or(`analista_credito.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("bankruptcy_records")
          .select("id, company_name, document, type, status")
          .or(`company_name.ilike.${searchTerm},document.ilike.${searchTerm}`)
          .limit(5),
        supabase
          .from("blacklist")
          .select("id, documento, tipo, motivo, adicionado_por")
          .or(`documento.ilike.${searchTerm},motivo.ilike.${searchTerm}`)
          .limit(5),
      ]);

      const items: SearchResult[] = [];

      (clientsRes.data || []).forEach((c) => {
        items.push({
          id: c.id,
          type: "client",
          title: c.razao_social,
          subtitle: [c.cnpj_cpf, c.cidade && c.estado ? `${c.cidade}/${c.estado}` : null].filter(Boolean).join(" · "),
          href: `/cedentes/${c.id}`,
        });
      });

      // Also search analyses by client name
      const analysesByClientRes = await supabase
        .from("credit_analysis")
        .select("id, status, credit_score, created_at, analista_credito, clients!inner(razao_social, cnpj_cpf)")
        .or(`razao_social.ilike.${searchTerm},cnpj_cpf.ilike.${searchTerm}`, { referencedTable: "clients" })
        .limit(5);

      const allAnalyses = [
        ...(analysesRes.data || []),
        ...(analysesByClientRes.data || []),
      ];

      // Deduplicate
      const seen = new Set<string>();
      allAnalyses.forEach((a) => {
        if (seen.has(a.id)) return;
        seen.add(a.id);
        const client = a.clients as any;
        items.push({
          id: a.id,
          type: "analysis",
          title: client?.razao_social || "Análise",
          subtitle: [client?.cnpj_cpf, a.analista_credito ? `Analista: ${a.analista_credito}` : null].filter(Boolean).join(" · "),
          status: a.status,
          href: `/analises/${a.id}`,
        });
      });

      setResults(items);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/10 hover:bg-white/15 transition-colors text-white/50 hover:text-white/70 text-xs"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">Buscar...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/35">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-white/15 rounded-md px-2.5 py-1.5 min-w-[280px]">
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 text-white/50 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5 text-white/50" />
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar clientes, análises, CNPJ..."
          className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/35 flex-1"
        />
        <button onClick={() => { setOpen(false); setQuery(""); setResults([]); }} className="text-white/35 hover:text-white/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Results dropdown */}
      {(results.length > 0 || (query.length >= 2 && !loading)) && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[360px]">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Nenhum resultado para "{query}"
            </div>
          ) : (
            <div className="max-h-[320px] overflow-y-auto">
              {/* Group by type */}
              {["client", "analysis"].map((type) => {
                const group = results.filter((r) => r.type === type);
                if (group.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                      {type === "client" ? "Cedentes" : "Análises de Crédito"}
                    </div>
                    {group.map((result) => {
                      const idx = results.indexOf(result);
                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            idx === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                          )}
                        >
                          <div className="h-7 w-7 rounded-md flex items-center justify-center bg-muted shrink-0">
                            {result.type === "client" ? (
                              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{result.title}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{result.subtitle}</div>
                          </div>
                          {result.status && (
                            <StatusBadge status={result.status} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
