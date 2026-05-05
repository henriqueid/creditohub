# CLAUDE.md — Contexto Permanente · CreditoHub

> Leia este arquivo no início de qualquer sessão. Ele substitui a necessidade de re-explicar o projeto.

---

## 1. O que é o CreditoHub

Plataforma SaaS B2B de análise de crédito e CRM para factoring, FIDC e securitização.
Migrado do Lovable Cloud para código próprio — hospedagem planejada na Vercel.

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
| Fonte | Geist (sans) + JetBrains Mono (code) |
| Build | Vite · bundle atual ~1.9MB (precisa code splitting) |

---

## 3. Supabase — Projeto Ativo

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://rwypdyksgmzrxruzgldk.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGci...IUGk` (JWT exp ~2036) |
| Project ID | `rwypdyksgmzrxruzgldk` |

Configurado em `c:\DEV\creditohub\.env.local`.
Auth: `localStorage`, `persistSession: true`, `autoRefreshToken: true`.
RLS ativo em todas as tabelas. Todas as queries exigem sessão autenticada.

---

## 4. SINK Design System — Regras Absolutas

### 4.1 Paleta de tokens (usar SEMPRE estes, nunca Tailwind genérico)

```
Fundos escuros:   sink-deep (#07232A)  sink-deep-2  sink-deep-3  sink-deep-4
Menta/accent:     sink-mint (#2BD49C)  sink-mint-2  sink-mint-3 (#17A679)  sink-mint-soft
Neutros quentes:  sink-cream  sink-cream-2  sink-paper  sink-fog (#D9E3DF)
Texto:            sink-ink (#0A1F24)
Semânticos:       sink-warn (#F3B84A)  sink-danger (#E26B5A)
Status:           status-approved (#17A679)  status-restricted  status-committee  status-rejected  status-draft
```

### 4.2 Mapeamento obrigatório (nunca usar a coluna ERRADO)

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

### 4.3 Border-radius

```
rounded-sink-sm (6px)  rounded-sink-md (10px)  rounded-sink-lg (16px)
rounded-sink-xl (24px)  rounded-sink-pill (999px)
```

### 4.4 Sombras

```
shadow-sink-sm  shadow-sink-md  shadow-sink-lg  shadow-sink-glow
```

### 4.5 Sidebar e Navbar

Sidebar: fundo `bg-sink-deep`, texto `sidebar-foreground`, accent `sidebar-accent`.
Navbar: fundo `bg-sink-deep` / `navbar`, texto `navbar-foreground`.
**Nunca usar branco ou cinza genérico no sidebar/navbar.**

### 4.6 Login (Auth.tsx)

Painel esquerdo: `bg-sink-deep` com `NodeNetwork` (canvas animado — 28 nós mint conectados por linhas).
Painel direito: `bg-sink-cream`.
Logo: `/logo.svg` (SVG mint sobre transparente).

---

## 5. Layout — Regras de Espaçamento

- **Nunca usar `max-w-*` em páginas principais** — usar `w-full`
- Padding padrão de página: `p-5` (não `p-6` ou `p-10`)
- Gap de seções: `space-y-6`
- Cards e formulários internos podem ter `max-w-3xl` se for um form estreito por design

---

## 6. Edge Functions — Status Atual

| Função | O que faz | Status |
|---|---|---|
| `analyze-document` | Extrai dados de PDF via GPT-4o | Código OK · **falta `AI_API_KEY`** no Supabase Secrets |
| `generate-insights` | Gera parecer/risco/perfil via GPT-4o | Código OK · **falta `AI_API_KEY`** |
| `deal-followup-check` | Cria tarefas para deals parados | Código OK · **falta `pg_cron.schedule()`** |
| `monitoring-runner` | Roda monitoramento de cedentes | Código OK · **falta `pg_cron.schedule()`** |
| `bureau` | Orquestra consultas a bureaus de crédito | Adaptadores são mocks · Bureau real pendente |
| `consulta-externa` | Gateway API externa de crédito | OK · falta `EXTERNAL_CONSULTA_API_URL` + `EXTERNAL_CONSULTA_API_KEY` |

**Nenhuma edge function foi deployada no novo projeto Supabase ainda.**

**IA hardcoded para OpenAI (gpt-4o).** Se mudar para Anthropic, atualizar URL e formato do request em `analyze-document/index.ts` e `generate-insights/index.ts`.

---

## 7. Automações Ativas (sem configuração)

- **Trigger de banco:** ao aprovar análise (`approved` ou `approved_restricted`), cria tarefas CRM automaticamente em 7 e 30 dias.
- **Deal automático:** ao finalizar comitê com aprovação, cria deal no CRM no primeiro estágio ativo.
- **Prospect → Deal:** ao converter prospect `qualified`, cria deal automaticamente.

---

## 8. Alertas Técnicos Pendentes

1. `AI_API_KEY` não configurada → IA não funciona
2. Bucket `analysis-attachments` precisa existir no Storage
3. `insertSnapshotSocios` tem erro silencioso (não trata `error` do insert)
4. `bureau/index.ts` usa `supabase.auth.getClaims(token)` — verificar compatibilidade SDK
5. Playwright usa `lovable-agent-playwright-config` (devDep Lovable) — substituir por config nativa
6. Bundle ~1.9MB — implementar code splitting com `React.lazy` / `import()`
7. `pg_cron` instalado mas sem jobs definidos — crons do `deal-followup-check` e `monitoring-runner` não rodam

---

## 9. Referências ao Lovable — Estado Atual

**Código de produção (`src/`):** ZERO referências. Completamente independente.

**Ainda com referências (apenas testes):**
- `playwright.config.ts` — importa `lovable-agent-playwright-config`
- `playwright-fixture.ts` — importa `lovable-agent-playwright-config`

Não afeta produção. Cleanup opcional.

---

## 10. Estrutura de Arquivos — Responsabilidades

```
src/
  pages/          → 30 páginas (ver BUSINESS_RULES.md para lógica de cada uma)
  components/     → componentes reutilizáveis
  components/ui/  → shadcn/ui (não modificar diretamente)
  lib/            → lógica de negócio pura (sem UI)
  hooks/          → hooks React
  integrations/supabase/client.ts  → cliente Supabase (não modificar)

supabase/
  migrations/     → 25 migrations SQL rodadas no novo projeto
  functions/      → 6 edge functions (Deno)

public/
  logo.svg        → logo oficial CreditoHub (mint sobre transparente)
```

---

## 11. Sistema de Agentes (ver AGENTS.md)

4 agentes especializados + 1 orquestrador:

| Agente | Fase | Domínio |
|---|---|---|
| Lógica de Negócio | 0 | `src/lib/`, `src/hooks/` — regras e cálculos |
| Backend · Schema | 0 | `supabase/migrations/` — tabelas, RLS |
| Backend · Edge Functions | 1 | `supabase/functions/` |
| Frontend · Componentes | 1 | `src/components/` |
| Frontend · Páginas | 2 | `src/pages/` |
| Testes | 3 (E2E) / qualquer (unit) | `src/test/`, Playwright |

**Regra de ouro:** Fases 0 e 1 rodam em paralelo. Agente nunca lê contexto de outro domínio.

---

## 12. Status Flow — credit_analysis

```
draft → in_committee → approved
                     → approved_restricted
                     → rejected → draft (re-análise)
```

Transições via drag (Kanban Cedentes): `cadastrado→draft`, `draft→in_committee`, `rejected→draft`.
Transições `in_committee→decisão`: somente via CommitteeVoting.

---

## 13. Regras de Negócio Globais (resumo)

1. **Blacklist tem prioridade máxima** — verificada antes de qualquer dado na Consulta
2. **Score determina cor em todo o sistema:** ≥ 700 = `status-approved`, 400–699 = `sink-warn`, < 400 = `sink-danger`
3. **Score tier:** ≥ 800 = AAA, ≥ 700 = AA, ≥ 600 = A, else = B
4. **Comitê é inviolável** — status `in_committee`+ não pode ser alterado por drag
5. **Deal automático na aprovação** — primeiro estágio ativo de `deal_stages`
6. **Prospect qualificado** = score ≥ 60; não qualificado = score < 30; pendente = intermediário
7. **Auditoria automática** — triggers de banco registram em `audit_log` (não controlado no frontend)
8. **Cálculos automáticos no dossiê:** score → limite sugerido → taxa → concentração → HHI

---

## 14. O que já foi feito neste projeto

- [x] Migração completa do Lovable Cloud para código próprio
- [x] Novo projeto Supabase criado e 25 migrations rodadas (31 tabelas)
- [x] Logo real (`/logo.svg`) em toda a app (sidebar, navbar, auth, favicon)
- [x] Auth funcional via Supabase (login, signup, reset de senha)
- [x] SINK Design System implementado: tokens, tipografia Geist, sidebar/navbar deep teal
- [x] Layout sem max-width constraints — `w-full` em todas as páginas principais
- [x] Animação NodeNetwork no painel esquerdo do login (canvas, 28 nós mint)
- [x] **Purga completa de cores genéricas Tailwind** — 80+ instâncias substituídas por tokens SINK em 17 arquivos
- [x] AGENTS.md reestruturado com fases de paralelismo explícitas
- [x] CLAUDE.md criado (este arquivo)

## 15. Pendências Conhecidas

- [ ] Deploy das 6 edge functions no novo Supabase
- [ ] Configurar `AI_API_KEY` no Supabase Secrets
- [ ] Criar bucket `analysis-attachments` no Storage
- [ ] Configurar `pg_cron` jobs para `deal-followup-check` e `monitoring-runner`
- [ ] Code splitting — bundle 1.9MB → lazy load por rota
- [ ] Limpar Playwright (remover dependência `lovable-agent-playwright-config`)
- [ ] Deploy na Vercel (substituir Lovable Cloud)
- [ ] Corrigir erro silencioso em `insertSnapshotSocios`
