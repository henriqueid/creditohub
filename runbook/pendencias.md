## Pendências conhecidas

### Migrations a rodar manualmente no Supabase Studio

- `supabase/migrations/20260507_pacote4_campos_financeiros.sql` — campos financeiros numéricos + `credit_analysis_revenue`. **Validar dados não-numéricos antes** (ver query em `schema.md`).
- `supabase/migrations/20260507_pacote5_comite_profissional.sql` — `committee_members`, `voter_id`, `is_locked`, override fields, RPC `finalize_committee`.

### Bugs/débitos técnicos

- `types.ts` desatualizado — `monthly_volume`, `prospect_id`, `anthropic_api_key` não estão tipados (frontend usa `as any`). Regenerar com `npx supabase gen types typescript`. Após rodar migrations 20260507, regenerar pra pegar `committee_members`, `credit_analysis_revenue`, novas colunas.
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
