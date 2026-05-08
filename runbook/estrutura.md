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
└── agents/             # 8 agentes especializados (.md cada)
    ├── credit-domain.md
    ├── crm-pipeline.md
    ├── db-architect.md
    ├── edge-functions.md
    ├── ui-trilho.md
    ├── security-auditor.md
    ├── test-writer.md
    └── runbook-keeper.md  # Mantém runbook/ atualizado

runbook/                # Referência operacional (este diretório, 1 arquivo por tópico)
```
