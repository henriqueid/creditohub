# CLAUDE.md — Contexto Permanente · CreditoHub

> Leia este arquivo no início de qualquer sessão. Ele substitui a necessidade de re-explicar o projeto.
>
> **Pra referência operacional rápida** (rotas, schema, edge functions, comandos, pendências, decisões), consulte [`runbook/README.md`](./runbook/README.md) — pasta com 1 arquivo por tópico, mantida pelo agente `runbook-keeper`. Cada agente lê apenas os arquivos do seu domínio (mapa em `runbook/README.md`).
>
> **Após qualquer feature/fix relevante**, dispatch o `runbook-keeper` pra atualizar o arquivo correto do runbook. Critério de "relevante": nova rota, nova tabela, nova edge function, decisão de produto, mudança de fluxo, deprecation. Bug fix pontual e refactor cosmético NÃO disparam.

---

## 1. O que é o CreditoHub

Plataforma SaaS B2B de análise de crédito e CRM para factoring, FIDC e securitização.

**Usuário:** Henrique — empreendedor não-técnico. Usa linguagem natural (pt-BR). Toma decisões rápidas. Prefere ação a planejamento excessivo.

**Tom de resposta:** direto, sem rodeios, sem emoji. Português. Confirmações curtas.

---

## 2. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilo | Tailwind CSS + shadcn/ui + SINK Design System |
| Roteamento | react-router-dom v6 |
| Estado servidor | TanStack Query v5 |
| Animações | framer-motion |
| Backend | Supabase (PostgreSQL + PostgREST + Auth + Storage + Edge Functions) |
| Edge Functions | Deno (TypeScript) |
| IA | Anthropic Claude (`claude-sonnet-4-6`) — chave por usuário em `profiles.anthropic_api_key` |
| Fonte | Geist (sans) + JetBrains Mono (code) |

> Detalhes operacionais (URLs, secrets, project IDs) em `runbook/setup.md`. Estado das edge functions em `runbook/edge-functions.md`.

---

## 3. SINK Design System — Regras Absolutas

### 3.1 Paleta de tokens (usar SEMPRE estes, nunca Tailwind genérico)

```
Fundos escuros:   sink-deep (#07232A)  sink-deep-2  sink-deep-3  sink-deep-4
Menta/accent:     sink-mint (#2BD49C)  sink-mint-2  sink-mint-3 (#17A679)  sink-mint-soft
Neutros quentes:  sink-cream  sink-cream-2  sink-paper  sink-fog (#D9E3DF)
Texto:            sink-ink (#0A1F24)
Semânticos:       sink-warn (#F3B84A)  sink-danger (#E26B5A)
Status:           status-approved (#17A679)  status-restricted  status-committee  status-rejected  status-draft
```

### 3.2 Mapeamento obrigatório (nunca usar a coluna ERRADO)

| ERRADO ❌ | CERTO ✅ |
|---|---|
| `text-green-*`, `text-emerald-*` | `text-status-approved` |
| `text-amber-*`, `text-yellow-*` | `text-sink-warn` |
| `text-red-*` | `text-sink-danger` |
| `text-blue-*` | `text-sink-mint-3` |
| `text-purple-*` | `text-sink-mint` |
| `text-orange-*` | `text-status-restricted` |
| `text-gray-*`, `text-slate-*` | `text-sink-ink/50` ou `text-muted-foreground` |
| `bg-green-100` | `bg-status-approved/10` |
| `bg-amber-100` | `bg-sink-warn/10` |
| `bg-red-100` | `bg-sink-danger/10` |
| `bg-blue-*` | `bg-sink-mint-3/10` |
| `bg-gray-100` | `bg-sink-fog/30` |
| `border-green-*` | `border-status-approved/30` |
| `border-amber-*` | `border-sink-warn/30` |
| `border-red-*` | `border-sink-danger/30` |

### 3.3 Border-radius e sombras

```
rounded-sink-sm (6px)  rounded-sink-md (10px)  rounded-sink-lg (16px)
rounded-sink-xl (24px)  rounded-sink-pill (999px)

shadow-sink-sm  shadow-sink-md  shadow-sink-lg  shadow-sink-glow
```

### 3.4 Sidebar e Navbar

Sidebar: fundo `bg-sink-deep`, texto `sidebar-foreground`, accent `sidebar-accent`.
Navbar: fundo `bg-sink-deep` / `navbar`, texto `navbar-foreground`.
**Nunca usar branco ou cinza genérico no sidebar/navbar.**

---

## 4. Layout — Regras de Espaçamento

- **Nunca usar `max-w-*` em páginas principais** — usar `w-full`
- Padding padrão de página: `p-5` (não `p-6` ou `p-10`)
- Gap de seções: `space-y-6`
- Cards e formulários internos podem ter `max-w-3xl` se for um form estreito por design

---

## 5. Estrutura de Arquivos — Responsabilidades

```
src/
  pages/          → páginas (uma por rota)
  components/     → componentes reutilizáveis
  components/ui/  → shadcn/ui (não modificar diretamente)
  lib/            → lógica de negócio pura (sem UI)
  hooks/          → hooks React
  integrations/supabase/client.ts  → cliente Supabase (não modificar)

supabase/
  migrations/     → SQL versionado
  functions/      → edge functions (Deno)

runbook/          → referência operacional viva (mantida pelo runbook-keeper)
.claude/agents/   → 8 agentes especializados
```

> Mapa detalhado de rotas em `runbook/rotas.md`. Estrutura completa em `runbook/estrutura.md`.

---

## 6. Sistema de Agentes (ver AGENTS.md + runbook/README.md)

8 agentes especializados em `.claude/agents/`. Cada um lê apenas seus arquivos do `runbook/` antes da task — sem contexto de domínio alheio.

| Agente | Domínio |
|---|---|
| `credit-domain` | dossiê, comitê, scoring, prontidão |
| `crm-pipeline` | deals, prospects, funil, kanban |
| `db-architect` | migrations, schema, RLS, multi-tenancy |
| `edge-functions` | Deno, integrações Anthropic/BrasilAPI/bureau |
| `ui-trilho` | design system, tokens, animações |
| `security-auditor` | RLS, JWT, PII, OWASP |
| `test-writer` | Playwright (E2E) + Vitest (unit) |
| `runbook-keeper` | mantém `runbook/` atualizado |

**Regra de ouro:** agentes nunca leem código de domínio alheio. Orquestrador resolve conflitos.

---

## 7. Status Flow — credit_analysis

```
draft → in_committee → approved
                     → approved_restricted
                     → rejected → draft (re-análise)
```

Transições via drag (Kanban): `cadastrado→draft`, `draft→in_committee`, `rejected→draft`.
Transição `in_committee → decisão`: **só** via `finalize_committee` RPC (CommitteeVoting).

> Detalhes do RPC, override e edição de voto em `runbook/funil.md`.

---

## 8. Regras de Negócio Globais

1. **Blacklist tem prioridade máxima** — verificada antes de qualquer dado na Consulta
2. **Score determina cor em todo o sistema:** ≥ 700 = `status-approved`, 400–699 = `sink-warn`, < 400 = `sink-danger`
3. **Score tier:** ≥ 800 = AAA, ≥ 700 = AA, ≥ 600 = A, else = B (fonte única: `getScoreGrade` em `src/lib/credit-calculations.ts` — **não duplicar**)
4. **Comitê é inviolável** — status `in_committee+` não pode ser alterado por drag; só via `finalize_committee` RPC. Override admin exige `reason`.
5. **Deal automático na aprovação** — primeiro estágio ativo de `deal_stages` (criado pelo frontend em `CommitteeVoting`).
6. **Prospect qualificado** = score ≥ 60; não qualificado = score < 30; pendente = intermediário
7. **Auditoria automática** — triggers de banco registram em `audit_log` (não controlado no frontend)
8. **Cálculos no dossiê** (todos em `src/lib/credit-calculations.ts`): score → limite sugerido → taxa → concentração → HHI

> Decisões de produto detalhadas em `runbook/decisoes.md`. Pendências e débitos em `runbook/pendencias.md`.
