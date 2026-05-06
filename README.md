# CreditoHub · Trilho

Plataforma SaaS B2B de análise de crédito e CRM para factoring, FIDC e securitização.

## O que faz

Funil completo do cedente, da prospecção ao portfólio:

```
Consulta CNPJ  →  Prospect  →  Pipeline (deal)  →  Análise (dossiê)  →  Comitê  →  Portfólio
   BrasilAPI       qualificação    negociação        underwriting       votação      operação
```

Cada etapa é uma decisão consciente do operador — nada se promove sozinho. Estados rastreáveis entre prospect, deal e análise.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 · TypeScript · Vite |
| UI | Tailwind CSS · shadcn/ui · Trilho design system |
| Estado servidor | TanStack Query v5 |
| Animações | framer-motion |
| Drag-and-drop | @hello-pangea/dnd |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| AI | Anthropic Claude (Sonnet 4.6) — chave por usuário |
| Bureau público | BrasilAPI (CNPJ via Receita Federal) |

## Setup local

Pré-requisito: Node.js 20+.

```bash
# 1. Clone e instale
git clone <repo-url>
cd creditohub
npm install

# 2. Configure as variáveis de ambiente
cp .env.local.example .env.local   # se houver template; senão crie .env.local com:
# VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
# VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
# VITE_SUPABASE_PROJECT_ID=<project-id>

# 3. Rode o dev server
npm run dev
# → http://localhost:8080
```

## Estrutura

```
src/
├── pages/               # 31 páginas (rotas)
├── components/
│   ├── ui/              # shadcn primitives (não modificar)
│   ├── trilho/          # Design system (PageHeader, KPI, Card, etc.)
│   ├── auth/            # Login (TrilhoHeroLoop, StatsCounter, MiniPipeline)
│   ├── credit/          # Análise (AIInsights, ConcentrationChart, RiskRadar...)
│   ├── crm/             # Comercial (NewDealDialog, ClientTagManager)
│   └── *.tsx            # Shared layout (AppNavbar, AppLayout, StatusBadge)
├── lib/                 # Lógica pura (cálculos, formatters, helpers)
├── hooks/               # Hooks customizados (useCommitteeRequirements...)
├── integrations/
│   └── supabase/        # Cliente + types gerados
└── test/                # Playwright

supabase/
├── migrations/          # 28+ SQL migrations (rodadas no projeto remoto)
└── functions/           # 6 edge functions (Deno)
```

## Módulos principais

| Rota | Função | Submenu |
|---|---|---|
| `/` | Painel inicial — alertas, KPIs, funil de crédito | — |
| `/consulta` | Consulta CNPJ (BrasilAPI + bureau + base interna) | Comercial |
| `/prospects` | Inbox de leads pré-qualificados | Comercial |
| `/crm/pipeline` | Pipeline de deals (drag-and-drop) | Comercial |
| `/crm/dashboard` | Painel comercial (funil, ranking) | Comercial |
| `/analises` | Kanban de análises com sync ao Pipeline | Crédito |
| `/analises/:id` | Dossiê de crédito (8 seções, IA, indicadores) | Crédito |
| `/comite` | Pauta do comitê | Crédito |
| `/comite/:id` | Tela de votação | Crédito |
| `/cedentes` | Portfólio (em análise + decididos) | Crédito |
| `/blacklist` | CNPJs bloqueados | Crédito |
| `/configuracoes` | Empresa, políticas, requisitos do comitê, automações, integrações, acessos | — |
| `/perfil` | Conta + chave Anthropic do usuário | — |

## IA por usuário

Cada usuário cadastra a própria chave Anthropic em **Meu Perfil → Configurações de IA**. A chave fica em `profiles.anthropic_api_key` (RLS isolada por usuário) e é passada nas chamadas das edge functions `generate-insights` e `analyze-document`.

Não há chave compartilhada — seus créditos, seu controle.

## Configurações por tenant

Em `/configuracoes`:
- **Políticas de crédito** — thresholds, limites, taxas
- **Requisitos do comitê** — quais campos do dossiê são obrigatórios pra análise avançar (configurável por bloco)
- **Automações** — verificação automática de blacklist, score, envio ao comitê
- **Integrações** — bureau de crédito, APIs externas
- **Acessos** — usuários e roles

## Multi-tenancy + RLS

Todas as tabelas têm `tenant_id` com policies RLS:
```sql
USING (tenant_id = public.get_user_tenant_id(auth.uid()))
```

Usuários de tenants diferentes nunca veem dados um do outro. Trigger `set_tenant_id_from_user()` preenche `tenant_id` automaticamente em INSERTs.

## Comandos úteis

```bash
npm run dev              # Dev server (HMR)
npm run build            # Build de produção
npm run preview          # Preview do build
npm run lint             # ESLint
npm run test:e2e         # Playwright E2E
```

## Documentação adicional

- [`CLAUDE.md`](./CLAUDE.md) — Contexto permanente do projeto (stack, design system, regras)
- [`BUSINESS_RULES.md`](./BUSINESS_RULES.md) — Regras de negócio detalhadas por página
- [`AGENTS.md`](./AGENTS.md) — Sistema de agentes especializados pra tarefas complexas
- [`BACKEND_AUDIT.md`](./BACKEND_AUDIT.md) — Auditoria do estado das edge functions e integrações

## Licença

Privado — propriedade da Trilho. Não distribuir.
