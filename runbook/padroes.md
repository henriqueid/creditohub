## Padrões da casa

### Tokens (`src/lib/tokens.ts`)

```ts
T.marinho      = "#0A1538"
T.esmeralda    = "#00D49A"
T.amber        = "#D9A300"
T.danger       = "#B0182A"
T.text         = "#0A1538"
T.textMute     = "rgba(10,21,56,0.62)"
T.textFaint    = "rgba(10,21,56,0.42)"
T.border       = "rgba(10,21,56,0.07)"
T.borderMed    = "rgba(10,21,56,0.10)"
T.borderStrong = "rgba(10,21,56,0.16)"
T.cinza        = "#E8E9E2"
T.off          = "#F7F7F2"
T.paper        = "#FBFBF7"
T.white        = "#FFFFFF"
```

### Mapeamento obrigatório — sem Tailwind genérico

| ❌ ERRADO | ✅ CERTO |
|---|---|
| `text-green-*` | `text-status-approved` |
| `text-red-*` | `text-sink-danger` |
| `text-amber-*` | `text-sink-warn` |
| `text-gray-*` | `text-muted-foreground` ou `T.textMute` |
| `bg-green-100` | `bg-status-approved/10` |

### Layout

- Padding de página: **`p-4 sm:p-7`** (consistente)
- Gap entre seções: `space-y-[14px]`
- Border-radius card: `rounded-[14px]` (= 14px) ou `rounded-sink-lg` (= 16px) — escolha consistente por contexto
- Sombra padrão card: `0 1px 3px rgba(10,21,56,0.05), 0 4px 12px -4px rgba(10,21,56,0.06)`

### Tipografia

- **Sans:** Geist (`var(--font-sans)`)
- **Mono:** JetBrains Mono (`var(--font-mono)`) — labels uppercase, números, código
- Labels: 10-11px mono uppercase letter-spacing 0.10em
- Body: 13-14px Geist
- KPIs: mono bold tabular-nums

### Naming

- Component file: PascalCase (`PageHeader.tsx`)
- Hook: camelCase com prefixo `use` (`useCommitteeRequirements.ts`)
- Lib utility: kebab-case (`analysis-status.ts`)
- Migration: `<YYYYMMDDHHMMSS>_<descricao_snake>.sql`
