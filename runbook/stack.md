## Stack

| Camada | Tecnologia | Notas |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Vite v5.4, sem SSR |
| Estilo | Tailwind + shadcn/ui + Trilho/SINK | Tokens em `src/lib/tokens.ts` |
| Estado servidor | TanStack Query v5 | StaleTime padrão 5min |
| Animação | framer-motion | Pill pattern com `layoutId` |
| Drag-and-drop | @hello-pangea/dnd | Pipeline + Análises kanban |
| Backend | Supabase | PostgreSQL + Auth + Storage + Edge Functions |
| Edge Functions | Deno (TypeScript) | esm.sh imports |
| AI | Anthropic Claude (Sonnet 4.6) | Per-user API key em `profiles` |
| Bureau público | BrasilAPI | Free, sem auth, só CNPJ |
