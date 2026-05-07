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

### Comitê — finalização via RPC

- `finalize_committee(p_analysis_id, p_final_decision, p_override_reason)` calcula a decisão dos votos:
  - reject majoritário → `rejected`
  - approve majoritário sem restrict → `approved`
  - approve+restrict > reject → `approved_restricted`
  - senão → `rejected` (conservador)
- Se `p_final_decision` diverge do calculado → exige `p_override_reason` (e `is_admin`); grava em `committee_override_*`
- Trava todos os votos do comitê (`is_locked = true`)
- Registra evento `'finalize_committee'` em `audit_log` com diff de status + votos
- Retorna `{ ok, was_override, calculated, final }`

### Edição de voto

- Voto próprio é editável enquanto `is_locked = false` (botão "Editar" em `CommitteeVoting`); badge "Travado" se travado
- Insert de voto inclui `voter_id: auth.uid()`
- Após `finalize_committee`, votos ficam imutáveis pra todos
- Override admin: accordion no UI com `reason` obrigatória; tarja amber no topo se análise teve override
