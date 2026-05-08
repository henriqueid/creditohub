## Dossiê de análise

`CreditAnalysisForm.tsx` (`/analises/:id`) — 1800+ linhas. Edita `credit_analysis` + tabelas filhas.

### Blocos do formulário (na ordem)

1. **Cliente** — read-only, linka `/cedentes/:id/perfil`
2. **Operacional**
   - `modalidade_operacao` (multi-select CSV, não voltar pra single)
   - `prazo_medio_dias`, `ticket_medio`, `volume_mensal_estimado`
   - Mini-bloco "Patrimonial": `tipo_imovel_sede`
3. **Financeira**
   - `capital_social`, `receita_liquida` (numéricos)
   - `margem_liquida`, `indice_liquidez`, `endividamento` (decimais 0-1 ou >1 conforme métrica)
   - `credit_analysis_revenue` (year, month, revenue) — substitui texto livre de faturamento
4. **Sacados** — `credit_analysis_sacados` (tabela filha). CRUD inline, com cálculo automático de concentração + HHI.
5. **Sócios** — `credit_analysis_socios`. Snapshot vem da consulta externa; pode ser editado.
6. **Anexos** — `credit_analysis_attachments`. Upload no bucket `analysis-attachments`. Cada upload chama edge function `analyze-document` (Claude extrai dados estruturados).
7. **AI Insights** — `AIInsightsPanel` em cada bloco. Chama `generate-insights` (5 tipos: client/market/financial/risk/summary).
8. **Parecer** — texto livre + decisão sugerida.

### Tempo de atividade

Derivado de `clients.data_fundacao` — **não é input livre** no dossiê. Mudou? Edita o cliente, não a análise.

### Prontidão pro comitê

- Hook `useCommitteeRequirements()` retorna `COMMITTEE_FIELD_OPTIONS` (campos exigidos por bloco) e `evaluateReadiness(requiredKeys, analysis, extras)` retorna `{ score: 0-1, missing: [...] }`.
- Score 100% obrigatório pra arrastar `draft → in_committee` no Kanban.
- Aceita `0` explícito (MEI sem funcionários não trava).
- Configuração de quais campos contam vive em `tenant_committee_requirements` (multi-tenant).

### Cálculos automáticos (não duplicar — `src/lib/credit-calculations.ts`)

- `classifyRisk(score)` → very_high/high/medium/medium_low/low/very_low (cortes 700/400)
- `getScoreGrade(score)` → AAA (≥800) / AA (≥700) / A (≥600) / B (else)
- `suggestLimit(score, ticketMedio, ...)` → limite sugerido em R$
- `suggestRate(score, modalidade)` → taxa em %
- `calculateConcentration(sacados)` → top1, top5, HHI
- `calculateFinancialRatios(analysis)` → capitalGiroLiquido, etc.

### Mobile

- Smartphone (<640) abre overlay read-only — edição bloqueada por escopo.
- Tablet (768+) é experiência completa.

### Sync com Pipeline

`findDealStageForAnalysisStatus(status, dealStages)` retorna o stage onde o deal vinculado deve estar quando a análise muda de status. Frontend chama isso a cada mudança.
