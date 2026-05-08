# Runbook · CreditoHub

> Referência operacional rápida — quebrada em 1 arquivo por tópico pra agentes lerem só o que precisam. Mantida pelo agente `runbook-keeper`.

**Última atualização:** 2026-05-08

---

## Mapa: pra que tarefa, leia que arquivo

| Vou fazer… | Leia |
|---|---|
| Criar/alterar tabela ou coluna | `schema.md` + `rls.md` |
| Configurar RLS / policies / multi-tenancy | `rls.md` |
| Rodar migration manualmente | `comandos.md` + `pendencias.md` |
| Adicionar/editar edge function | `edge-functions.md` + `auth.md` |
| Mexer com Claude/IA | `ai.md` |
| Integrar bureau ou API externa | `external-apis.md` |
| Adicionar rota/tela | `rotas.md` + `estrutura.md` |
| Mexer com análise de crédito (dossiê, comitê, score) | `dossie.md` + `funil.md` + `decisoes.md` |
| Mexer com CRM (deals, prospects, pipeline) | `pipeline.md` + `funil.md` |
| Estilizar com tokens SINK / Trilho | `padroes.md` |
| Auditoria de segurança | `rls.md` + `auth.md` + `edge-functions.md` |
| Escrever teste (E2E ou unit) | `setup.md` + `rotas.md` + `funil.md` |
| Setup novo / instalar deps | `setup.md` |

## Mapa: agente → arquivos do domínio

| Agente | Lê em paralelo no início |
|---|---|
| `db-architect` | schema.md, rls.md, comandos.md, pendencias.md |
| `edge-functions` | edge-functions.md, ai.md, external-apis.md, auth.md |
| `credit-domain` | funil.md, dossie.md, decisoes.md, schema.md |
| `crm-pipeline` | pipeline.md, rotas.md, funil.md |
| `ui-trilho` | padroes.md, estrutura.md |
| `security-auditor` | rls.md, auth.md, edge-functions.md, ai.md |
| `test-writer` | setup.md, comandos.md, rotas.md, funil.md |
| `runbook-keeper` | este README + arquivo(s) a editar |

## Categoria de mudança → arquivo a atualizar (pro `runbook-keeper`)

| Mudança no projeto | Arquivo | Notas |
|---|---|---|
| Nova rota | `rotas.md` | + `estrutura.md` se nova pasta |
| Nova tabela / coluna / enum | `schema.md` | + `rls.md` se policy nova |
| Nova policy / mudança em RLS | `rls.md` | |
| Nova edge function ou alteração de auth | `edge-functions.md` | + `auth.md` se afeta JWT |
| Nova integração externa | `external-apis.md` | |
| Mudança em fluxo de análise/comitê | `funil.md` ou `dossie.md` | |
| Mudança no Pipeline CRM | `pipeline.md` | |
| Decisão de produto importante | `decisoes.md` | |
| Débito técnico novo / migration pendente | `pendencias.md` | |
| Novo token / convenção visual | `padroes.md` | |
| Novo comando crítico (deploy, SQL) | `comandos.md` | |

## Outros docs (não duplicar conteúdo)

- `CLAUDE.md` → comportamento e tom esperados
- `AGENTS.md` → quando usar cada agente especializado
- `BUSINESS_RULES.md` → regras de negócio detalhadas
- `README.md` → setup e overview pra humano

## Regras de edição (pro runbook-keeper)

- Conciso. Bullets, tabelas, ponteiros pra arquivos. Sem parágrafos.
- Edite só o arquivo afetado pela mudança. Não reescreva múltiplos.
- Atualize "Última atualização" deste README quando editar qualquer arquivo.
- Não duplique conteúdo entre arquivos — ponteie.
- Se conteúdo virou débito técnico, mova pra `pendencias.md`.
