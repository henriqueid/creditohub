# Sistema de Agentes — CreditoHub

Agentes especializados em `.claude/agents/` que o Claude Code invoca via Task tool. Cada agente tem domínio próprio, ferramentas restritas e regras da casa pré-carregadas — você não precisa repetir contexto.

## Quando usar cada agente

| Agente | Quando chamar |
|---|---|
| **`credit-domain`** | Análise de crédito, dossiê (8 seções), comitê, scoring, modalidades de operação, prontidão pro comitê, regras de underwriting |
| **`crm-pipeline`** | Pipeline de deals, prospects, contatos, atividades, tarefas, dashboard comercial, ConsultaCPFCNPJ, NewDealDialog, conversões |
| **`db-architect`** | Migrations SQL, schema, RLS policies, multi-tenancy, triggers, functions SECURITY DEFINER, Supabase Postgres |
| **`edge-functions`** | Funções Deno em `supabase/functions/`, integração Anthropic Claude, BrasilAPI, bureau, JWT auth, CORS |
| **`ui-trilho`** | Design system Trilho/SINK, tokens, animações framer-motion, layout, componentes compartilhados, design |
| **`security-auditor`** | Auditoria de segurança transversal — RLS, JWT, PII, secrets, prompt injection. Read-only (reporta, não corrige) |
| **`test-writer`** | Playwright E2E, Vitest unitários, smoke tests, fixtures de auth |
| **`runbook-keeper`** | Mantém [`RUNBOOK.md`](./RUNBOOK.md) atualizado após features/fixes relevantes. Read-only no código, edita só RUNBOOK.md |

## Como invocar

Quando o pedido cruza domínios (ex: "criar tela de novo módulo X" envolve UI + DB + edge function), o orquestrador (Claude Code principal) **dispara múltiplos agentes em paralelo** quando não há dependência:

```
Usuário pede feature
    ↓
Orquestrador analisa → quebra em tarefas
    ↓
┌──────────────┬──────────────┬──────────────┐
│ db-architect │ ui-trilho    │ test-writer  │  ← paralelos
│ (migration)  │ (componente) │ (smoke spec) │
└──────────────┴──────────────┴──────────────┘
    ↓
crm-pipeline / credit-domain consome a entrega
    ↓
security-auditor revisa antes do commit
```

## Regras de paralelismo

1. **db-architect + ui-trilho** rodam em paralelo (schema vs visual não se bloqueiam)
2. **edge-functions** depende de db-architect (precisa do schema antes)
3. **credit-domain / crm-pipeline** consomem entregas dos outros — depois deles
4. **security-auditor** roda no final (ou sob demanda do usuário)
5. **test-writer** pode rodar a qualquer momento — escrever spec antes da implementação é OK

## Princípios

- **Cada agente tem prompt curto** descrevendo seu domínio e padrões da casa — você não repete
- **Tools restritas** ao domínio — `security-auditor` só lê, `db-architect` não mexe em `src/`
- **Contratos explícitos** — agentes se comunicam por interface (props, schema, payload), não compartilham implementação
- **O orquestrador resolve conflitos** — nenhum agente decide arquitetura sozinho

## Adicionando novos agentes

Quando o catálogo de agentes não cobre um domínio recorrente, crie um novo arquivo em `.claude/agents/<nome>.md` com:

```yaml
---
name: <kebab-case>
description: Quando usar (1-3 frases — bait pro orquestrador escolher esse)
tools: Read, Edit, Write, Glob, Grep, Bash
---

System prompt: domínio, padrões, arquivos críticos, restrições.
```

Mantenha o set enxuto. Se um domínio aparece menos de 1x por semana, melhor usar `general-purpose`.
