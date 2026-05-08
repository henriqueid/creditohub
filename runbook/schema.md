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
| `credit_analysis_revenue` | Faturamento mensal estruturado (year, month, revenue numeric(15,2)) | credit_analysis_id (CASCADE), tenant_id via trigger |
| `credit_committee` | Votos individuais do comitê (com `voter_id`, `is_locked`) | credit_analysis_id (CASCADE), voter_id → auth.users |
| `committee_members` | Membros do comitê por tenant (role: voter/chair/observer, active) | tenant_id, user_id |
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

### Migrations 20260507 (pacotes 4 e 5) — pendentes de aplicação manual

`supabase/migrations/20260507_pacote4_campos_financeiros.sql`:
- `credit_analysis.margem_liquida | indice_liquidez | endividamento`: text → `numeric(8,4)` (decimal: `0.1234` = 12.34%)
- Antes de rodar, valide: `SELECT margem_liquida FROM credit_analysis WHERE margem_liquida ~ '[^0-9.\-]' AND margem_liquida <> '';`
- Cria `credit_analysis_revenue` com RLS tenant-scoped + trigger pra preencher `tenant_id` do parent
- `historico_pagamentos` segue `text` (tradeoff documentado)

`supabase/migrations/20260507_pacote5_comite_profissional.sql`:
- Cria `committee_members` (admin gerencia)
- `credit_committee` ganha `voter_id UUID` (auth.users) + `is_locked boolean`. Policy UPDATE: `is_locked = false AND (voter_id = auth.uid() OR is_admin)`
- `credit_analysis` ganha: `committee_override_by`, `committee_override_reason`, `committee_override_at`, `committee_calculated_decision`
- RPC `finalize_committee(p_analysis_id, p_final_decision, p_override_reason)` SECURITY DEFINER
