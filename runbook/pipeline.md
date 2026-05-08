## Pipeline CRM

- **LOSS_REASONS** (enum frontend): `preco | prazo | concorrencia | sem_fit | cliente_desistiu | outro`. Dialog obrigatório ao arrastar deal pra estágio "Perdido" — grava `lost_reason` no deal.
- **Vincular análise**: botão em deal card abre dialog listando análises do mesmo cliente (atribui `credit_analysis_id`).
- **Probabilidade**: slider 0-100 step 5 em `NewDealDialog` (default 50). Pill colorido no card: mint ≥70, amber ≥40, mute <40.
- **DealDetail**:
  - `pages/DealDetail.tsx` em `/crm/deal/:id` (página dedicada)
  - `DealDetailSheet` (drawer 640px à direita) reusa `DealDetailContent` compartilhado
  - Abrir do Pipeline = drawer; link direto = página
