# Multi-Agent Dev System — CreditoHub

## Visão Geral

Sistema de agentes especializados para construção paralela do CreditoHub.
O **Orquestrador** recebe a demanda, quebra em tarefas, identifica dependências e dispara os agentes em paralelo por fase.

```
Usuário
  └── Orquestrador
        │
        ├── FASE 0 (paralelo) ──┬── Agente Lógica de Negócio
        │                       └── Agente Backend · Schema
        │
        ├── FASE 1 (paralelo) ──┬── Agente Backend · Edge Functions
        │                       └── Agente Frontend · Componentes
        │
        ├── FASE 2 ──────────── Agente Frontend · Páginas
        │
        └── FASE 3 ──────────── Agente Testes
```

**Regra de ouro:** um agente só bloqueia o próximo se existir dependência de contrato.
Quando não há dependência → rodam em paralelo, na mesma fase.

---

## Mapa de Dependências

```
Lógica de Negócio ──▶ define contratos de dado
Backend · Schema  ──▶ cria tabelas/views            (paralelo com Lógica)
Backend · Funções ──▶ expõe endpoints               (depende de Schema)
Frontend · Comp.  ──▶ constrói blocos visuais       (depende de contratos de Lógica)
Frontend · Páginas──▶ monta telas e consome API     (depende de Funções + Componentes)
Testes            ──▶ valida fluxos completos        (depende de Páginas)
```

Dependências paralelas permitidas:
- Lógica de Negócio + Backend Schema → **sempre paralelos**
- Backend Edge Functions + Frontend Componentes → **paralelos após Fase 0**
- Testes (specs/unitários) → **podem iniciar em qualquer fase** (spec antes da impl)

---

## Agentes Especializados

### Agente Backend
**Domínio:** Supabase — banco de dados e funções serverless

| # | Atribuição | Fase | Escopo |
|---|---|---|---|
| 1 | **Schema & Migrations** | 0 | Tabelas, índices, RLS policies, migrations SQL |
| 2 | **Edge Functions** | 1 | Funções Deno em `supabase/functions/`, integrações externas |

**Contexto mínimo necessário:**
- Schema atual das tabelas envolvidas
- Contrato de entrada/saída (se edge function)
- Variáveis de ambiente disponíveis

**Arquivos de responsabilidade:**
```
supabase/
  migrations/
  functions/
```

---

### Agente Frontend
**Domínio:** React — interface do usuário

| # | Atribuição | Fase | Escopo |
|---|---|---|---|
| 1 | **Componentes** | 1 | Blocos reutilizáveis em `src/components/`, sem lógica de negócio |
| 2 | **Páginas** | 2 | Montagem de telas em `src/pages/`, rotas, composição de componentes |

**Contexto mínimo necessário:**
- Design system (`src/components/ui/`, tokens SINK)
- Interface/props do componente ou shape dos dados
- Rota e nome da página

**Arquivos de responsabilidade:**
```
src/
  components/
  pages/
  App.tsx (rotas)
```

---

### Agente Testes
**Domínio:** Qualidade — garantia de funcionamento

| # | Atribuição | Fase | Escopo |
|---|---|---|---|
| 1 | **Unitários** | qualquer | Testes com Vitest em `src/test/`, funções puras e hooks |
| 2 | **E2E** | 3 | Fluxos completos com Playwright, golden paths e edge cases |

**Contexto mínimo necessário:**
- Comportamento esperado da funcionalidade
- Arquivo a ser testado (caminho exato)
- Casos de erro relevantes

**Arquivos de responsabilidade:**
```
src/test/
playwright.config.ts
vitest.config.ts
```

---

### Agente Lógica de Negócio
**Domínio:** Regras e cálculos do produto — independente de UI e banco

| # | Atribuição | Fase | Escopo |
|---|---|---|---|
| 1 | **CRM** | 0 | Pipeline, estágios de deal, atividades, follow-up, contatos |
| 2 | **Crédito** | 0 | Scoring, análise de risco, integração bureaus, dossiê, comitê |

**Contexto mínimo necessário:**
- Regra de negócio em linguagem clara (não código)
- Inputs e outputs esperados
- Casos especiais e exceções

**Arquivos de responsabilidade:**
```
src/lib/
src/hooks/
```

---

## Protocolo de Delegação

### Formato padrão de tarefa (Orquestrador → Agente)

```
AGENTE: [Backend | Frontend | Testes | Lógica de Negócio]
ATRIBUIÇÃO: [Schema | Edge Function | Componente | Página | Unitário | E2E | CRM | Crédito]
FASE: [0 | 1 | 2 | 3]
PARALELO COM: [lista de agentes rodando simultaneamente nesta fase]

TAREFA:
[Descrição objetiva do que deve ser feito]

ARQUIVOS ALVO:
- [caminho/do/arquivo.ts]

CONTRATO:
- Entrada: [o que recebe]
- Saída: [o que retorna/renderiza]

DEPENDE DE:
- [agente/entrega que deve existir antes]

RESTRIÇÕES:
- [O que NÃO deve ser alterado]
```

### Formato padrão de retorno (Agente → Orquestrador)

```
STATUS: [Concluído | Bloqueado | Parcial]
FASE: [0 | 1 | 2 | 3]

ARQUIVOS ALTERADOS:
- [caminho/do/arquivo.ts]

CONTRATO ENTREGUE:
- [O que foi implementado — shape de dados, props, endpoint]

DESBLOQUEIA:
- [Agentes/fases que podem avançar após esta entrega]

BLOQUEIOS (se houver):
- [O que falta para concluir]
```

---

## Regras de Paralelismo

1. **Fase 0 sempre paralela** — Lógica de Negócio e Backend Schema nunca se bloqueiam entre si
2. **Fase 1 sempre paralela** — Edge Functions e Componentes são independentes entre si
3. **Frontend Componentes não espera backend** — usa contrato de dado da Lógica de Negócio como contrato de props
4. **Testes unitários não esperam fase final** — podem ser escritos junto com a Fase 0/1
5. **Orquestrador dispara todos os agentes da mesma fase de uma vez** — não espera um terminar para começar o outro
6. **Agente nunca lê o que não é seu** — não passar código de outras camadas no contexto
7. **Contratos explícitos** — agentes se comunicam por interfaces, não por implementação

---

## Exemplo de Uso

**Usuário pede:** "Adicionar tela de relatório de inadimplência"

**Orquestrador quebra em fases:**

### FASE 0 — dispara em paralelo

| Agente | Atribuição | Tarefa |
|---|---|---|
| Lógica de Negócio | Crédito | Definir: o que é inadimplente, campos necessários, cálculos, shape de saída |
| Backend | Schema | Criar view `v_inadimplencia` com os campos esperados pelo contrato |

> ⏸ Aguarda Fase 0 concluir antes de disparar Fase 1

### FASE 1 — dispara em paralelo

| Agente | Atribuição | Tarefa |
|---|---|---|
| Backend | Edge Function | Endpoint `GET /inadimplencia` retornando shape definido na Fase 0 |
| Frontend | Componente | `InadimplenciaCard` + tabela de listagem (usa shape da Lógica como props) |
| Testes | Unitário | Testa função de cálculo de inadimplência de `src/lib/` |

> ⏸ Aguarda Fase 1 concluir antes de disparar Fase 2

### FASE 2

| Agente | Atribuição | Tarefa |
|---|---|---|
| Frontend | Página | Montar `/inadimplencia` com os componentes da Fase 1, consumir endpoint da Fase 1 |

> ⏸ Aguarda Fase 2 concluir antes de disparar Fase 3

### FASE 3

| Agente | Atribuição | Tarefa |
|---|---|---|
| Testes | E2E | Fluxo: acessar página → ver lista → filtrar por período → exportar |
