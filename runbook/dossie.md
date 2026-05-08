## Dossiê de análise

`CreditAnalysisForm` (`/analises/:id`) — blocos relevantes:

- **Operacional → mini-bloco "Patrimonial"**: `tipo_imovel_sede`
- **Análise Financeira (ou seção Financeira)**: `capital_social`, `receita_liquida` (migrados pra cá), além de `margem_liquida | indice_liquidez | endividamento` agora numéricos decimais
- **Tempo de atividade**: derivado de `clients.data_fundacao` (não é mais input livre)
- **Faturamento mensal**: estruturado via `credit_analysis_revenue` (year, month, revenue) — substitui texto livre

`useCommitteeRequirements.ts`:
- Bloco "Financeira" inclui `capital_social` e `receita_liquida` na verificação de prontidão
- `COMMITTEE_FIELD_OPTIONS` reflete a nova organização
