# Backend Audit — CreditoHub

**Data:** 2026-05-04  
**Escopo:** Camada de integração Supabase — independência total do Lovable  
**Projeto:** `c:/DEV/creditohub`

---

## 1. Cliente Supabase (`src/integrations/supabase/client.ts`)

**Status: OK**

```ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { storage: localStorage, persistSession: true, autoRefreshToken: true }
});
```

- Variáveis corretas: `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`
- Ambas estão definidas em `.env.local` com valores reais
- Sem referências ao Lovable
- `storage: localStorage`, `persistSession: true`, `autoRefreshToken: true` — configuração adequada para SPA

---

## 2. Hooks (`src/hooks/`)

| Hook | Usa Supabase? | Status |
|------|--------------|--------|
| `use-mobile.tsx` | Nao | OK — apenas detecta viewport |
| `use-toast.ts` | Nao | OK — estado local de toast |

Os dois hooks nao fazem nenhuma query ao Supabase. Sao utilitarios puros de UI.

---

## 3. Bibliotecas em `src/lib/`

### `bureau-client.ts` — Status: OK

- Importa `supabase` de `@/integrations/supabase/client` corretamente
- Usa `supabase.functions.invoke("bureau", ...)` — chama Edge Function autenticada
- Tratamento de erro correto: retorna objeto `BureauOrchestratorResponse` com `status: "erro"` em caso de falha
- Sem referencias ao Lovable

### `external-consulta.ts` — Status: OK com ALERTA

- Importa `supabase` de `@/integrations/supabase/client` corretamente
- Usa `supabase.functions.invoke("consulta-externa", ...)` para API propria
- Usa `fetch` direto para `brasilapi.com.br` (publica, sem chave) — correto
- Tratamento de erro correto para `not_configured` e outros erros
- Sem referencias ao Lovable
- **ALERTA:** `Source 3: Serasa / Bureau` sempre retorna `not_configured` — placeholder ainda nao implementado (comportamento esperado, documentado no codigo)

### `consulta-snapshot.ts` — Status: OK

- Importa `supabase` de `@/integrations/supabase/client` corretamente
- Funcao `insertSnapshotSocios` usa `supabase.from("credit_analysis_socios").insert(rows)` sem verificacao de erro
- Demais funcoes sao utilitarios puros (sem queries)

### `credit-calculations.ts` — Status: OK

- Nao faz nenhuma query ao Supabase
- Logica pura de calculos financeiros e de risco

### `formatters.ts` — Status: OK

- Sem queries. Apenas formatacao de strings, datas e valores

### `pdf-export.ts` — Status: OK

- Importa `supabase` de `@/integrations/supabase/client` corretamente
- `fetchPrintData` usa `supabase.from("credit_analysis")`, `credit_analysis_sacados`, `credit_analysis_socios`
- Tratamento de erro correto: `if (analysisRes.error) throw analysisRes.error`

### `prospect-qualification.ts` — Status: OK

- Importa `supabase` de `@/integrations/supabase/client` corretamente
- Faz query em `system_settings` (com `.maybeSingle()` — seguro) e `credit_engine_rules`
- `saveProspectQualification` usa `.upsert` com `onConflict: "documento"` — correto
- Tratamento de erro: `if (error) throw error`

### `utils.ts` — Status: OK

- Sem queries. Apenas `cn()` (classnames helper)

---

## 4. Componentes com Queries Supabase (`src/components/`)

| Componente | Tabelas/Features Usadas | Status |
|-----------|------------------------|--------|
| `AIInsightsPanel.tsx` | `functions.invoke("generate-insights")`, `credit_analysis_insights` | OK |
| `AnalysisDealsLink.tsx` | `deals` (insert) | OK |
| `ClientTagManager.tsx` | `tags`, `client_tags` | OK |
| `GlobalSearch.tsx` | Usa `supabase` importado | OK |
| `NotificationBell.tsx` | Usa `supabase` importado | OK |
| `ProtectedRoute.tsx` | `auth.onAuthStateChange`, `auth.getSession` | OK |
| `SectionFileUpload.tsx` | `storage("analysis-attachments")`, `credit_analysis_attachments`, `functions.invoke("analyze-document")` | OK |
| `UserAvatar.tsx` | `auth.onAuthStateChange`, `auth.getSession`, `auth.signOut` | OK |

---

## 5. Pages com Queries Supabase (`src/pages/`)

| Pagina | Tabelas Consultadas | Status |
|--------|---------------------|--------|
| `AuditLog.tsx` | `audit_log`, `profiles` | OK |
| `Auth.tsx` | `auth.signInWithPassword`, `auth.signUp`, `auth.resetPasswordForEmail` | OK |
| `BankruptcyReport.tsx` | `clients`, `credit_analysis_sacados`, `bankruptcy_records` | OK |
| `Blacklist.tsx` | `blacklist` | OK |
| `BureauSettings.tsx` | `bureau_providers` | OK |
| `ClientForm.tsx` | `clients` | OK |
| `ClientHistory.tsx` | `clients` | OK |
| `Clients.tsx` | `clients` | OK |
| `CommitteeQueue.tsx` | `credit_analysis` | OK |
| `CommitteeVoting.tsx` | `credit_committee`, `committee_result`, `deals` | OK |
| `ConsultaCPFCNPJ.tsx` | `blacklist` (via prospect-qualification), `prospects` | OK |
| `CreditAnalysisForm.tsx` | `clients`, `credit_analysis`, `credit_analysis_sacados`, `credit_analysis_socios`, `credit_analysis_attachments`, `credit_analysis_insights` | OK |
| `CreditAnalysisList.tsx` | `credit_analysis`, `deals`, `deal_stages` | OK |
| `CreditEngineSettings.tsx` | `credit_engine_rules` | OK |
| `CRMActivities.tsx` | `profiles`, `activities`, `clients` | OK |
| `CRMClientProfile.tsx` | `clients`, `credit_analysis`, `deals`, `contacts`, `activities`, `crm_tasks`, `blacklist`, `bankruptcy_records`, `monitored_invoices`, `patrimonial_info` | OK |
| `CRMContacts.tsx` | `contacts`, `clients` | OK |
| `CRMDashboard.tsx` | `deal_stages`, `deals`, `crm_tasks`, `activities`, `contacts` | OK |
| `CRMPipeline.tsx` | `deal_stages`, `deals`, `clients` | OK |
| `CRMTasks.tsx` | `crm_tasks`, `clients` | OK |
| `Dashboard.tsx` | `clients`, `committee_result`, `profiles`, `auth.getUser` | OK |
| `Integrations.tsx` | `integration_configs` | OK |
| `InvoiceMonitoring.tsx` | `clients`, `monitored_invoices`, `credit_analysis_sacados`, `monitoring_groups`, `monitoring_group_clients` | OK |
| `PatrimonialReport.tsx` | `clients`, `patrimonial_info` | OK |
| `PipelineMetrics.tsx` | Usa `supabase` importado | OK |
| `Prospects.tsx` | `prospects`, `clients`, `deals` | OK |
| `ResetPassword.tsx` | `auth.updateUser` | OK |
| `Settings.tsx` | `auth.getSession`, `integration_configs` | OK |

---

## 6. Edge Functions (`supabase/functions/`)

| Funcao | Variaveis de Ambiente | Status |
|--------|----------------------|--------|
| `bureau/index.ts` | `SUPABASE_URL`, `SUPABASE_ANON_KEY` (Deno, automatico) | OK |
| `bureau/orchestrator.ts` | Credenciais dos provedores via `credential_secret_name` | OK |
| `consulta-externa/index.ts` | `EXTERNAL_CONSULTA_API_URL`, `EXTERNAL_CONSULTA_API_KEY` | OK — trata `not_configured` |
| `deal-followup-check/index.ts` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Deno, automatico) | OK |
| `generate-insights/index.ts` | `AI_API_KEY` (Deno secrets) | ALERTA (ver abaixo) |
| `analyze-document/index.ts` | `AI_API_KEY` (Deno secrets) | ALERTA (ver abaixo) |
| `monitoring-runner/index.ts` | `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_URL` (Deno, automatico) | OK |

---

## 7. Referencias ao Lovable

### Encontradas no Codigo

| Arquivo | Referencia | Impacto |
|---------|-----------|---------|
| `playwright.config.ts` | `import { createLovableConfig } from "lovable-agent-playwright-config/config"` | APENAS TESTES |
| `playwright-fixture.ts` | `export { test, expect } from "lovable-agent-playwright-config/fixture"` | APENAS TESTES |

**Conclusao:** Nao existe nenhuma referencia ao Lovable no codigo de producao (`src/`). As unicas referencias estao nos arquivos de configuracao do Playwright para testes automatizados. O codigo da aplicacao e completamente independente do Lovable.

**Acao necessaria (opcional):** Se quiser remover a dependencia do Lovable tambem dos testes, substituir `playwright.config.ts` e `playwright-fixture.ts` pela configuracao nativa do Playwright. Isso nao afeta producao.

---

## 8. Tabelas Supabase Referenciadas

| Tabela | Operacoes |
|--------|-----------|
| `activities` | SELECT, INSERT |
| `audit_log` | SELECT |
| `bankruptcy_records` | SELECT, INSERT, UPDATE, DELETE |
| `blacklist` | SELECT, INSERT, DELETE |
| `bureau_consultas` | SELECT, INSERT (via edge function) |
| `bureau_providers` | SELECT, INSERT, UPDATE, DELETE |
| `client_tags` | SELECT, INSERT, DELETE |
| `clients` | SELECT, INSERT, UPDATE |
| `committee_result` | SELECT, INSERT |
| `contacts` | SELECT, INSERT, UPDATE, DELETE |
| `credit_analysis` | SELECT, INSERT, UPDATE |
| `credit_analysis_attachments` | SELECT, INSERT, UPDATE, DELETE |
| `credit_analysis_insights` | SELECT, INSERT, DELETE |
| `credit_analysis_sacados` | SELECT, INSERT, DELETE |
| `credit_analysis_socios` | SELECT, INSERT, DELETE |
| `credit_committee` | SELECT, INSERT |
| `credit_engine_rules` | SELECT, INSERT, UPDATE, DELETE |
| `crm_tasks` | SELECT, INSERT, UPDATE, DELETE |
| `deal_stages` | SELECT |
| `deals` | SELECT, INSERT, UPDATE |
| `integration_configs` | SELECT, INSERT, UPDATE, DELETE |
| `monitored_invoices` | SELECT, INSERT |
| `monitoring_group_clients` | SELECT, INSERT, DELETE |
| `monitoring_groups` | SELECT, INSERT, UPDATE, DELETE |
| `patrimonial_info` | SELECT, INSERT, UPDATE, DELETE |
| `profiles` | SELECT |
| `prospects` | SELECT, INSERT, UPDATE, DELETE (upsert) |
| `system_settings` | SELECT |
| `tags` | SELECT, INSERT, DELETE |
| `tenants` | Indireto (RLS) |
| `user_roles` | Indireto (RLS) |

**Storage bucket referenciado:** `analysis-attachments`

---

## 9. Alertas e Pontos de Atencao

### ALERTA 1 — Funcoes de IA exigem `AI_API_KEY` configurada

As Edge Functions `generate-insights` e `analyze-document` **falham imediatamente** se o secret `AI_API_KEY` nao estiver configurado no painel do Supabase. O codigo lanca `throw new Error("AI_API_KEY is not configured")`.

**Ambas estao hardcodadas para OpenAI:**
- URL: `https://api.openai.com/v1/chat/completions`
- Modelo: `gpt-4o`
- Ha comentarios `// TODO: Replace URL and model with chosen provider`

**Acao necessaria:** Configurar o secret `AI_API_KEY` no painel Supabase > Edge Functions > Secrets com a chave do provedor escolhido. Se usar Anthropic, tambem atualizar a URL e o formato do request nas duas funcoes.

### ALERTA 2 — `anon key` real necessaria para todas as queries

Todas as queries do frontend dependem da `VITE_SUPABASE_PUBLISHABLE_KEY` estar configurada corretamente no `.env.local`. O valor atual (`eyJhbGci...`) esta presente e parece valido (token JWT).

**Status:** Configurada. Verificar expiracao: o JWT tem `exp: 2089259394` (ano ~2036) — sem risco imediato.

### ALERTA 3 — RLS: todas as queries dependem de sessao autenticada

O projeto usa RLS em todas as tabelas com `tenant_id`. O `ProtectedRoute.tsx` forca autenticacao via `supabase.auth.onAuthStateChange` antes de renderizar qualquer pagina. Queries feitas antes do login retornarao vazio ou erro 403 — comportamento correto.

**Ponto de atencao em `insertSnapshotSocios` (`consulta-snapshot.ts`):**  
A funcao nao trata o erro do insert:
```ts
await supabase.from("credit_analysis_socios").insert(rows);
// Erro silenciado — nao ha "if (error) throw error"
```
Falha silenciosa pode deixar socios sem ser inseridos sem feedback ao usuario.

### ALERTA 4 — `bureau/index.ts` usa `supabase.auth.getClaims(token)`

Este metodo pode nao estar disponivel em versoes mais novas do SDK Supabase. Verificar compatibilidade com a versao `2.45.0` usada na Edge Function.

### ALERTA 5 — Storage bucket `analysis-attachments` precisa existir

O componente `SectionFileUpload` faz upload para `supabase.storage.from("analysis-attachments")`. Se o bucket nao existir no projeto Supabase, todos os uploads vao falhar com erro de bucket nao encontrado.

**Acao:** Verificar/criar o bucket `analysis-attachments` no painel Supabase > Storage, com politica RLS adequada.

### ALERTA 6 — Playwright usa `lovable-agent-playwright-config` 

Esta dependencia de `devDependencies` (nao encontrada no `package.json` na busca, mas referenciada nos arquivos `.ts`) pode quebrar `npm test` / `bun test` se o pacote nao estiver instalado ou nao for compativel com o ambiente local.

**Acao:** Para rodar testes sem Lovable, substituir os arquivos de configuracao do Playwright por configuracao nativa.

---

## 10. Resumo Executivo

| Categoria | Resultado |
|-----------|-----------|
| Referencias Lovable no codigo de producao | **ZERO** |
| Cliente Supabase configurado corretamente | **SIM** |
| Variaveis de ambiente corretas | **SIM** (`VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| Imports quebrados | **ZERO** |
| Tratamento de erros nas queries | **Adequado** (1 caso de erro silencioso em `insertSnapshotSocios`) |
| RLS respeitado | **SIM** — todas as queries passam pela sessao autenticada |
| Funcionalidade de IA | **Requer configuracao de `AI_API_KEY`** no Supabase secrets |
| Storage | **Requer criacao do bucket `analysis-attachments`** |

O projeto esta pronto para rodar de forma independente do Lovable. Os unicos items pendentes sao:
1. Configurar `AI_API_KEY` no Supabase secrets (para IA funcionar)
2. Confirmar existencia do bucket `analysis-attachments`
3. (Opcional) Corrigir erro silencioso em `insertSnapshotSocios`
4. (Opcional) Remover dependencia de testes do `lovable-agent-playwright-config`
