## Pipeline CRM

### Estágios

- Configurados em `deal_stages` (por tenant, ordenáveis). Cada stage tem `name`, `position`, `is_won`, `is_lost`, `is_active`.
- Frontend agrupa por `position` no Kanban (`CRMPipeline.tsx`).
- Estágio inicial (`position` mínimo `is_active`) é alvo do **deal automático** ao aprovar análise.

### LOSS_REASONS

Enum frontend (`src/lib/loss-reasons.ts` ou similar):
`preco | prazo | concorrencia | sem_fit | cliente_desistiu | outro`

Dialog obrigatório ao arrastar deal pra estágio `is_lost = true` — grava em `deals.lost_reason` + `lost_at` (timestamp). Sem motivo, não move.

### Guards de transição

- **Estágio `is_won` ou comitê**: exige análise vinculada e aprovada. AlertDialog se faltar — sugere abrir `LinkAnalysisDialog`.
- **Estágio "Comitê"** (heurística por nome): deal movido pra cá → análise vinculada vai pra `in_committee` (sync via `findDealStageForAnalysisStatus`).
- **Análise muda status** → deal vinculado é movido pro stage correspondente automaticamente.

### NewDealDialog

- Probabilidade: slider 0-100, step 5, default 50. Pill no card: mint ≥70, amber ≥40, mute <40.
- "Vincular análise existente" via `LinkAnalysisDialog` lista análises do mesmo cliente.
- Cria deal automaticamente quando prospect promovido (`prospect_id` preservado pra rastreabilidade).

### DealDetail — duas formas de abrir

- `pages/DealDetail.tsx` em `/crm/deal/:id` — página dedicada (link direto, deep link)
- `DealDetailSheet` — drawer 640px à direita do Kanban, reusa `DealDetailContent` compartilhado
- Abrir do Kanban = drawer; abrir de URL = página

### Iniciar análise direta do Pipeline

Botão "Iniciar análise" no `DealDetail` chama `ensureClientFromSnapshot` + cria `credit_analysis` em `draft` + redireciona pra `/analises/:id`. Vincula `prospect_id` se o deal veio de prospect.

### Helpers obrigatórios

- `src/lib/formatters.ts`: `cleanDocument`, `maskCNPJ`, `maskCPF`, `formatBRL`. **Não duplicar.**
- `src/lib/consulta-snapshot.ts`: `ensureClientFromSnapshot` — cria/recupera client a partir de payload de consulta.
