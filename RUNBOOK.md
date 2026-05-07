# RUNBOOK · CreditoHub / Trilho

> **Como usar este arquivo:** referência operacional rápida. Agentes e desenvolvedores vêm aqui pra "onde tá X", "como mudar Y", "qual o comando pra Z". Cada seção é curta com ponteiros pra arquivos/linhas quando relevante. Mantido pelo agente `runbook-keeper` — não inflar com detalhes que pertencem a outros docs.
>
> **Diferença dos outros docs:**
> - `CLAUDE.md` → comportamento e tom esperados do Claude
> - `AGENTS.md` → quando usar cada agente especializado
> - `BUSINESS_RULES.md` → regras de negócio detalhadas (longo)
> - `README.md` → setup e overview pra humano
> - `RUNBOOK.md` (este) → mapa operacional do projeto

**Última atualização:** 2026-05-09

---

## 📑 Sumário rápido

- [Stack](#stack)
- [Setup & Comandos](#setup--comandos)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Schema do banco](#schema-do-banco)
- [RLS & Multi-tenancy](#rls--multi-tenancy)
- [Rotas & Mapa de telas](#rotas--mapa-de-telas)
- [Fluxo do funil](#fluxo-do-funil)
- [Edge functions](#edge-functions)
- [AI integration (Claude)](#ai-integration-claude)
- [External APIs](#external-apis)
- [Auth flow](#auth-flow)
- [Padrões da casa](#padrões-da-casa)
- [Decisões de produto](#decisões-de-produto)
- [Pendências conhecidas](#pendências-conhecidas)
- [Comandos críticos](#comandos-críticos)

---

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

---

## Setup & Comandos

```bash
# Setup
npm install
cp .env.local.example .env.local  # criar com VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY

# Dev
npm run dev                    # http://localhost:8080
npm run build                  # produção
npm run preview                # preview do build

# Tests
npm run test:e2e              # Playwright
TEST_EMAIL=... TEST_PASSWORD=... npx playwright test --project=setup
TEST_EMAIL=... TEST_PASSWORD=... npx playwright test --project=smoke

# Supabase
npx supabase login            # 1x via browser
npx supabase functions deploy <nome> --project-ref rwypdyksgmzrxruzgldk
```

---

## Estrutura de pastas

```
src/
├── pages/              # 32 páginas (rotas)
├── components/
│   ├── ui/             # shadcn primitives (não modificar)
│   ├── trilho/         # Design system (PageHeader, KPI, Card, Sparkline, DataTable)
│   ├── auth/           # Login (TrilhoHeroLoop, StatsCounter, MiniPipeline)
│   ├── credit/         # Análise (AIInsights, ConcentrationChart, RiskRadar...)
│   ├── crm/            # Comercial (NewDealDialog, ClientTagManager)
│   └── *.tsx           # Shared (AppNavbar, AppLayout, StatusBadge, PageLoader)
├── lib/                # Lógica pura (sem UI)
│   ├── tokens.ts       # T object (cores)
│   ├── formatters.ts   # cleanDocument, maskCNPJ, formatBRL, formatDate
│   ├── analysis-status.ts          # ANALYSIS_STATUS const + findDealStageForAnalysisStatus
│   ├── consulta-snapshot.ts        # ensureClientFromSnapshot + snapshotToClient
│   ├── credit-calculations.ts      # score, limit, concentration, ratios, radar
│   ├── prospect-qualification.ts   # qualifyProspect + saveProspectQualification
│   └── external-consulta.ts        # fetchExternalConsulta (BrasilAPI direto + edge function)
├── hooks/
│   ├── useCommitteeRequirements.ts # COMMITTEE_FIELD_OPTIONS + evaluateReadiness
│   └── ...
├── integrations/
│   └── supabase/
│       ├── client.ts   # Supabase JS client config
│       └── types.ts    # Tipos auto-gerados (não editar)
└── test/               # Playwright + Vitest

supabase/
├── migrations/         # 30+ SQL migrations (rodadas no projeto remoto)
└── functions/          # 6 edge functions Deno
    ├── generate-insights/   # Claude — gera análise textual
    ├── analyze-document/    # Claude — extrai dados de PDF
    ├── consulta-externa/    # Gateway pra API externa (com fallback "not_configured")
    ├── bureau/              # Multi-bureau (Serasa/Boa Vista/Quod/Mock)
    ├── monitoring-runner/   # Cron de monitoramento (auth: service_role/x-cron-secret)
    └── deal-followup-check/ # Cron de tarefas atrasadas

.claude/
└── agents/             # 7 agentes especializados (.md cada)
    ├── credit-domain.md
    ├── crm-pipeline.md
    ├── db-architect.md
    ├── edge-functions.md
    ├── ui-trilho.md
    ├── security-auditor.md
    ├── test-writer.md
    └── runbook-keeper.md  # Mantém este arquivo atualizado
```

---

## Schema do banco

### Tabelas principais (todas com `tenant_id`)

| Tabela | O que é | FKs importantes |
|---|---|---|
| `tenants` | Empresas (factorings) | — |
| `profiles` | 1-to-1 com auth.users | tenant_id, anthropic_api_key |
| `user_roles` | Vincula user a tenant + role | tenant_id, role enum |
| `clients` | Cedentes | tenant_id |
| `prospects` | Inbox de leads pré-qualificados | tenant_id, client_id (SET NULL) |
| `deals` | Oportunidades comerciais | tenant_id, client_id, stage_id, prospect_id, credit_analysis_id |
| `deal_stages` | Estágios do Pipeline (configurável) | tenant_id |
| `credit_analysis` | Dossiê de análise de crédito | tenant_id, client_id, prospect_id |
| `credit_analysis_sacados` | Sacados da análise | credit_analysis_id (CASCADE) |
| `credit_analysis_socios` | Sócios da análise | credit_analysis_id (CASCADE) |
| `credit_analysis_attachments` | Anexos | credit_analysis_id (CASCADE) |
| `credit_analysis_insights` | Insights da IA Claude | credit_analysis_id (CASCADE) |
| `credit_committee` | Votos individuais do comitê | credit_analysis_id (CASCADE) |
| `committee_result` | Decisão final do comitê (limite, prazo) | credit_analysis_id (CASCADE) |
| `contacts` | Contatos do cliente | tenant_id, client_id |
| `activities` | Atividades CRM | tenant_id, client_id |
| `crm_tasks` | Tarefas CRM | tenant_id, client_id |
| `tags` + `client_tags` | Tags de cliente | tenant_id |
| `blacklist` | CNPJs bloqueados | tenant_id |
| `monitored_invoices` + `monitoring_groups` | Monitoramento NFs | tenant_id |
| `bankruptcy_records` | Registros falimentares | tenant_id |
| `patrimonial_info` | Info patrimonial | tenant_id |
| `bureau_consultas` | Cache de consultas a bureaus | tenant_id |
| `bureau_providers` | Configuração de bureaus por tenant | tenant_id |
| `integration_configs` | Integrações genéricas | tenant_id |
| `system_settings` | Configurações por tenant | tenant_id |
| `audit_log` | Audit trail (imutável) | tenant_id |
| `credit_engine_rules` | Regras do motor de crédito | tenant_id |

### Status enums críticos

- `credit_analysis.status`: `draft | in_committee | approved | approved_restricted | rejected`
- `prospects.qualification_status`: `qualified | not_qualified | pending`
- `committee_result.decisao_final`: `approved | approved_restricted | rejected`
- `app_role`: `admin | analista | comercial | comite | leitor`
- Todas tipadas em `src/integrations/supabase/types.ts` (auto-gerado)

### Chaves canônicas (ANALYSIS_STATUS)

```ts
import { ANALYSIS_STATUS } from "@/lib/analysis-status";
// Use ANALYSIS_STATUS.draft em vez de "draft" (string literal)
```

---

## RLS & Multi-tenancy

### Padrão da casa

Toda tabela business tem:
1. Coluna `tenant_id UUID NOT NULL` com DEFAULT `00000000-0000-0000-0000-000000000001`
2. FK pra `tenants(id) ON DELETE CASCADE`
3. Trigger `set_tenant_id_trigger BEFORE INSERT` (preenche pelo `auth.uid()`)
4. RLS habilitado com policies tenant-scoped:

```sql
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "<tabela>_select" ON public.<tabela>
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "<tabela>_insert" ON public.<tabela>
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "<tabela>_update" ON public.<tabela>
  FOR UPDATE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid())
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'analista')));

CREATE POLICY "<tabela>_delete" ON public.<tabela>
  FOR DELETE TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) AND public.is_admin(auth.uid()));
```

### Helpers SECURITY DEFINER (já criados)

- `public.get_user_tenant_id(_user_id UUID)` → tenant_id do user
- `public.has_role(_user_id, _role)` → boolean
- `public.is_admin(_user_id)` → atalho pra `has_role(_, 'admin')`
- `public.set_tenant_id_from_user()` → trigger function
- `public.handle_new_user()` → cria profile + role admin no signup
- `public.get_tenant_colleagues()` → lista users do mesmo tenant sem expor `anthropic_api_key`

### Profiles RLS estrita (migration 20260509000000)

- `profiles_select_self` — usuário só vê própria row (anthropic_api_key não vaza)
- Pra mostrar colega no UI: usa função `get_tenant_colleagues()` (não expõe key)

---

## Rotas & Mapa de telas

| Rota | Page | Submenu | Função |
|---|---|---|---|
| `/` | Dashboard | — | Painel inicial: alertas, KPIs, top cedentes |
| `/auth` | Auth | — | Login/signup/forgot |
| `/perfil` | Profile | — | Conta + chave Anthropic |
| `/configuracoes` | Settings | — | Empresa, políticas, requisitos comitê, automações, integrações, acessos |
| `/configuracoes/motor` | CreditEngineSettings | — | Pesos do motor |
| `/configuracoes/bureaus` | BureauSettings | — | Bureaus configurados |
| `/consulta` | ConsultaCPFCNPJ | Comercial | Busca CNPJ (BrasilAPI + bureau + base) |
| `/prospects` | Prospects | Comercial | Inbox de leads pré-qualificados |
| `/crm/dashboard` | CRMDashboard | Comercial | Painel comercial (funil + ranking) |
| `/crm/pipeline` | CRMPipeline | Comercial | Kanban de deals (DnD) |
| `/crm/contatos` | CRMContacts | Comercial | Lista de contatos |
| `/crm/atividades` | CRMActivities | Comercial | Atividades |
| `/crm/tarefas` | CRMTasks | Comercial | Tarefas |
| `/crm/cliente/:id` | CRMClientProfile | Comercial | (Legacy — será deprecado em favor de `/cedentes/:id/perfil`) |
| `/analises` | CreditAnalysisList | Crédito | Kanban de análises (DnD com sync ao Pipeline) |
| `/analises/nova` | CreditAnalysisForm | Crédito | Form (acessível só com warning) |
| `/analises/:id` | CreditAnalysisForm | Crédito | Dossiê (9 seções + 5 abas) |
| `/comite` | CommitteeQueue | Crédito | Pauta do comitê |
| `/comite/:id` | CommitteeVoting | Crédito | Tela de votação |
| `/cedentes` | Clients | Crédito | Portfólio (tabs por status) |
| `/cedentes/:id` | ClientForm | Crédito | Edição cadastral |
| `/cedentes/:id/perfil` | CedenteProfile | Crédito | Perfil 360° (NOVO) |
| `/cedentes/:id/historico` | ClientHistory | Crédito | Histórico de análises |
| `/cedentes/novo` | ClientForm | Crédito | Cadastro novo |
| `/blacklist` | Blacklist | Crédito | CNPJs bloqueados |
| `/monitoramento-nfs` | InvoiceMonitoring | Monitoramento | NFs monitoradas |
| `/monitoramento/performance` | PipelinePerformance | Monitoramento | Performance |
| `/falimentar` | BankruptcyReport | Crédito | Falimentar |
| `/patrimonial` | PatrimonialReport | — | Patrimonial |
| `/integracoes` | Integrations | — | Integrações |
| `/audit-log` | AuditLog | — | Log de auditoria |
| `/performance` | PipelineMetrics | — | Métricas |

---

## Fluxo do funil

```
Consulta (/consulta) → 2 botões:
  ├─ Adicionar como prospect → /prospects
  └─ Adicionar à carteira (cedente direto) → /cedentes (cria client + análise draft)

/prospects → 3 ações por card:
  ├─ Mover para Pipeline → cria client + deal estágio inicial → /crm/pipeline
  ├─ Iniciar análise direta → cria client + análise draft → /analises/:id
  └─ Descartar → soft delete (com cascade opcional se promovido)

Pipeline (/crm/pipeline) → arrasta deal entre estágios:
  ├─ Estágios "won/lost" precisam de análise aprovada (guard com AlertDialog)
  └─ Quando Pipeline está em estágio "Comitê" → análise vinculada vai pra in_committee

Análise (/analises) → arrasta análise entre estágios:
  draft → in_committee (exige 100% prontidão configurada)
  in_committee → approved/approved_restricted/rejected (decidido na votação)
  rejected → draft (re-análise)

Sync bidirecional: análise muda status → deal vinculado é movido pro stage correspondente
(função findDealStageForAnalysisStatus em lib/analysis-status.ts)
```

---

## Edge functions

| Função | Auth | Endpoint pattern | O que faz |
|---|---|---|---|
| `generate-insights` | JWT obrigatório | POST | Claude gera análise textual (5 tipos: client/market/financial/risk/summary). Lê `anthropic_api_key` do profile do user autenticado. |
| `analyze-document` | JWT obrigatório | POST | Claude extrai dados estruturados de PDF/texto via tool_use. Limite 5MB. |
| `consulta-externa` | JWT obrigatório | POST | Gateway pra API externa de crédito. Retorna `{status: "not_configured"}` se sem credenciais. |
| `bureau` | JWT obrigatório | POST | Multi-bureau (Serasa/BoaVista/Quod/Mock). Cache em `bureau_consultas`. Credenciais por env. |
| `monitoring-runner` | service_role OU x-cron-secret | POST | Cron — processa monitoring_groups vencidos. **Não aceita ANON_KEY** (público). |
| `deal-followup-check` | service_role OU x-cron-secret | POST | Cron — cria tarefas pra deals parados. **Não aceita ANON_KEY**. |

### Pattern de auth (use sempre):

```ts
async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw 401;
  const jwt = authHeader.slice(7);
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error } = await client.auth.getUser(jwt);
  if (error || !user) throw 401;
  return { userId: user.id, jwt };
}
```

---

## AI integration (Claude)

- **Provider:** Anthropic
- **Modelo:** `claude-sonnet-4-6`
- **Endpoint:** `https://api.anthropic.com/v1/messages`
- **Headers:** `x-api-key`, `anthropic-version: 2023-06-01`
- **Per-user key:** stored em `profiles.anthropic_api_key` (RLS self-only)
- **Edge functions buscam a key server-side** via JWT do user (nunca recebem do body)
- **Fallback:** env `ANTHROPIC_API_KEY` se user não configurou

### Onde aparece no UI

- `/perfil` → seção "Configurações de IA" (input mascarado da chave)
- `/analises/:id` → painel `AIInsightsPanel` em cada seção do dossiê
- `/analises/:id` → upload de documento → `SectionFileUpload` chama `analyze-document`

---

## External APIs

### BrasilAPI (público, sem auth)

- **Endpoint:** `https://brasilapi.com.br/api/cnpj/v1/{cnpj}`
- **CORS:** aberto (`*`)
- **Limitação:** só CNPJ (14 dígitos), não suporta CPF
- **Chamada:** direta do browser via `src/lib/external-consulta.ts`

### Bureau (configurável)

- Adapters em `supabase/functions/bureau/adapters/`
- Implementados: `mock` (funciona) | `serasa`/`boavista`/`quod` (stubs retornando "não implementado")
- Credenciais em env vars (não em DB)
- Cache em `bureau_consultas` com TTL

### Google Maps (opcional)

- Embed do mapa em `/consulta` quando `VITE_GOOGLE_MAPS_API_KEY` está setado
- Sem a env, iframe não renderiza (degrada graceful)

---

## Auth flow

1. **Signup público** está habilitado em `/auth` (modo signup)
2. Trigger `handle_new_user` cria:
   - `profiles` com `tenant_id` default
   - `user_roles` com role `admin` no tenant default
3. Login via Supabase Auth (`signInWithPassword`)
4. Reset password via `resetPasswordForEmail` → email com link → `/reset-password`
5. JWT armazenado em localStorage, autorefreshed

> **Pendência:** modelo SaaS B2B planejado mas não implementado (super-admin, leads, convites, licenças). Veja seção [Decisões de produto](#decisões-de-produto).

---

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

---

## Decisões de produto

### Em vigor

1. **Cada transição no funil é decisão humana** — sistema não promove automaticamente (Consulta → Prospect → Pipeline → Análise → Comitê → Portfólio).
2. **Análise nasce sempre vinculada a um cliente** — botão "Nova análise" foi removido em favor de "+ Nova consulta" com bypass condicional.
3. **Comitê é inviolável** — análise em status `in_committee+` só muda via tela de votação.
4. **AI key por usuário** — não há chave compartilhada do tenant. Cada user paga seus créditos.
5. **Multi-tenancy** — tenant default `00000000-0000-0000-0000-000000000001` pra dev/teste; novos users entram nele automaticamente.
6. **Mobile** — tablet (768+) é experiência completa; smartphone (<640) é read-only com overlay no dossiê.

### Pendentes (esperando alinhamento)

- **Modelo SaaS B2B** — super-admin (`/admin`) com lead capture (`/contato`), CRUD de tenants, sistema de convites por email, controle de licenças. Migrations e fluxo desenhados mas não implementados.
- **Volume operado real** — métrica "Top cedentes por volume" trocada por "Limite aprovado" como compromisso. Volume real depende de integração SPED/NFs (fase futura).

---

## Pendências conhecidas

### Bugs/débitos técnicos

- `types.ts` desatualizado — `monthly_volume`, `prospect_id`, `anthropic_api_key` não estão tipados (frontend usa `as any`). Regenerar com `npx supabase gen types typescript`.
- Versões mistas de `@supabase/supabase-js` em edge functions — deve estar tudo `2.49.4` agora (padronizado).
- Bundle size 1.8MB — code splitting com `React.lazy` foi feito pra rotas frias, mas hot paths (Dashboard, CRMPipeline, etc.) são eager.
- Audit_log RLS — policies tenant-scoped em vigor, mas vale verificar histórico de acesso do período pré-2026-04-28.

### Features parciais

- `bureau` adapters Serasa/BoaVista/Quod retornam "não implementado" — só Mock funciona.
- `consulta-externa` é stub — retorna `{status: "not_configured"}` se sem credenciais.
- `pg_cron` não está configurado — `monitoring-runner` e `deal-followup-check` não rodam automaticamente.
- Notificações no sino (Bell) são mocks em memória — quando fizer real, criar tabela `notifications` + realtime subscription.

### UX

- Dossiê de análise (`/analises/:id`) é overlay-bloqueado em mobile (<640) — read-only "navegável" não foi implementado por escopo.
- Pages órfãs (CRMClientProfile) podem ser deprecadas em favor de `/cedentes/:id/perfil` em futura limpeza.

---

## Comandos críticos

### SQL — rodar manualmente no Supabase SQL Editor

Migrations são criadas em `supabase/migrations/` mas a aplicação é manual (Docker não roda local). Cole o conteúdo do `.sql` no [SQL Editor](https://supabase.com/dashboard/project/rwypdyksgmzrxruzgldk/sql).

### Edge function deploy

```bash
npx supabase login                                                                              # 1x
npx supabase functions deploy <nome> --project-ref rwypdyksgmzrxruzgldk
```

### Test a função sem login (verificar deploy):

```bash
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST "https://rwypdyksgmzrxruzgldk.supabase.co/functions/v1/<nome>"
# Espera 401 (auth obrigatória)
```

### Auditoria de segurança

```bash
# Disparar agente
# Use Task tool com subagent_type: "security-auditor"
```

### Atualizar este RUNBOOK

Após feature/fix relevante, dispatch o agente `runbook-keeper` (`.claude/agents/runbook-keeper.md`) com diff dos commits recentes.

---

## Dicas pra agentes

1. **Antes de mexer em código:** procure aqui primeiro o ponteiro pro arquivo relevante.
2. **Status enums e tipos:** sempre importe de `lib/analysis-status.ts` — nunca strings literais.
3. **Cliente Supabase:** sempre `from("@/integrations/supabase/client")`.
4. **Cores:** use `T.*` ou tokens `sink-*` — nunca `bg-blue-500`.
5. **Cleanup:** quando entregar, atualize este RUNBOOK se mudou rota/tabela/edge function/decisão.
