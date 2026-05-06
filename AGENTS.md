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
- Design system (`src/components/ui/`, tokens Trilho)
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

---

# PLANO DE MIGRAÇÃO — TRILHO CRED DESIGN SYSTEM

> Redesign completo do frontend: substituição do SINK Design System pelo Trilho Design System.
> Referência visual: `c:\Users\henri\Downloads\TRILHO\design\`
> Fonte da verdade: arquivos `.html` em `references/` e código JSX em `source/`

## O que Muda

| Aspecto | Antes (SINK) | Depois (Trilho) |
|---|---|---|
| Paleta principal | `sink-deep` #07232A + `sink-mint` #2BD49C | `marinho` #0A1538 + `esmeralda` #00D49A |
| Background da app | Dark (`bg-sink-deep`) | Paper warm (`#F7F7F2`) |
| Sidebar | Presente — vertical, dark teal | **Removida** |
| Navegação | Sidebar com ícones + labels | **Topbar** com pílulas horizontais |
| Cards | Fundo dark/translúcido | Fundo branco `#FFFFFF` com borda sutil |
| Tipografia | Geist (mantém) | Geist (mantém) |
| Radius | `rounded-sink-*` | `rounded-lg` 16px / `rounded-xl` 20px |
| Status badges | 5 tokens sink | 8 tiers Trilho (AAA → D + status operacionais) |
| Módulo Performance | Não existe | **Nova página** |

## Módulos e Telas

| Módulo | Tela | Arquivo Atual | Ação |
|---|---|---|---|
| Painel | Dashboard | `src/pages/Dashboard.tsx` | Refazer |
| Crédito | Consulta CPF/CNPJ | `src/pages/ConsultaCPFCNPJ.tsx` | Refazer |
| Crédito | Cedentes (Kanban) | `src/pages/CreditAnalysisList.tsx` | Refazer |
| Crédito | Análise de Crédito | `src/pages/CreditAnalysisForm.tsx` | Refazer |
| Crédito | Comitê | `src/pages/CommitteeVoting.tsx` | Refazer |
| Comercial | Painel Comercial | `src/pages/CRMDashboard.tsx` | Refazer |
| Comercial | Pipeline | `src/pages/CRMPipeline.tsx` | Refazer |
| Comercial | Perfil de Cliente | `src/pages/ClientHistory.tsx` | Refazer |
| Monitoramento | NFs / Monitoramento | `src/pages/InvoiceMonitoring.tsx` | Refazer |
| Monitoramento | Performance da Esteira | *(não existe)* | **Criar** |

---

## FASE 0 — Fundação (rodam em paralelo)

### 0-A · Agente Tokens

**Tarefa:** Substituir o SINK Design System pelo Trilho Design System nos arquivos base.

**Arquivos alvo:**
- `tailwind.config.ts` — substituir tokens sink pelos tokens trilho
- `src/index.css` — substituir custom properties CSS

**Novos tokens (extrair de `design/tokens.json`):**

```ts
// tailwind.config.ts — colors
marinho: { DEFAULT: '#0A1538', deep: '#070F2B' },
esmeralda: { DEFAULT: '#00D49A', dark: '#009E73', soft: '#D6F5E8' },
off: '#F7F7F2',
paper: '#FBFBF7',
cinza: '#E8E9E2',
'cinza-soft': '#F0F1EB',
ink: { DEFAULT: '#0A1538' },
border: 'rgba(10,21,56,0.07)',
'border-strong': 'rgba(10,21,56,0.14)',
// status tiers
tier: {
  aaa: { bg: '#D6F5E8', fg: '#009E73' },
  aa:  { bg: '#D6F5E8', fg: '#009E73' },
  a:   { bg: '#D6F5E8', fg: '#009E73' },
  bbb: { bg: '#FFF6DC', fg: '#7A5B00' },
  bb:  { bg: '#FFE9B8', fg: '#7A5B00' },
  b:   { bg: '#FCE3CE', fg: '#8A3B00' },
  c:   { bg: '#FCE3CE', fg: '#8A3B00' },
  d:   { bg: '#F5D6DA', fg: '#7A0E1E' },
},
status: {
  aprovado:   { bg: '#D6F5E8', fg: '#009E73' },
  analise:    { bg: '#FFF6DC', fg: '#7A5B00' },
  comite:     { bg: '#FFE9B8', fg: '#7A5B00' },
  restrito:   { bg: '#FCE3CE', fg: '#8A3B00' },
  rejeitado:  { bg: '#F5D6DA', fg: '#7A0E1E' },
  rascunho:   { bg: '#E8E9E2', fg: '#0A1538' },
  avencer:    { bg: '#E8E9E2', fg: '#0A1538' },
  atrasado:   { bg: '#FCE3CE', fg: '#8A3B00' },
  vencido:    { bg: '#F5D6DA', fg: '#7A0E1E' },
}
```

```ts
// borderRadius
sm: '8px', md: '12px', lg: '16px', xl: '20px', pill: '999px'
// shadows
sm: '0 1px 4px rgba(10,21,56,0.06)',
md: '0 4px 12px rgba(10,21,56,0.08)',
lg: '0 8px 24px rgba(10,21,56,0.08)',
// letterSpacing
tight: '-0.03em', snug: '-0.025em', wide: '0.08em', wider: '0.12em'
```

**Restrições:**
- Manter `src/components/ui/` (shadcn) intocado — só substituir uso nas páginas
- Remover todos os tokens `sink-*` do tailwind.config.ts
- Remover a variável `--sidebar-*` do CSS (sidebar será removida)

---

### 0-B · Agente Layout Shell

**Tarefa:** Remover `AppSidebar.tsx` e `AppNavbar.tsx` e criar o novo shell de layout com **Topbar + Breadcrumb**.

**Arquivos alvo:**
- `src/components/AppSidebar.tsx` — **deletar ou esvaziar**
- `src/components/AppNavbar.tsx` — **refazer como Topbar**
- `src/components/Breadcrumb.tsx` — **criar**
- `src/App.tsx` — atualizar layout wrapper

**Especificação Topbar** (referência: `design/source/shared.jsx` → componente `Topbar`):

```
altura: 64px
fundo: marinho (#0A1538)
esquerda:
  - Logo (símbolo + wordmark "Trilho.")
  - Nav em pílulas: [Painel] [Comercial] [Crédito] [Monitoramento]
    pílula ativa: bg esmeralda/15, texto esmeralda, borda esmeralda/25
    pílula inativa: texto branco/62, hover bg branco/8
direita:
  - Input search (⌘K) — branco/8 bg, radius pill, 220px
  - Botão "+ Nova Consulta" — esmeralda bg, marinho text, radius pill (⌘J)
  - Bell icon com dot indicador
  - Avatar 32px (iniciais, bg esmeralda/20)
```

**Especificação Breadcrumb** (referência: `design/source/shared.jsx` → componente `Breadcrumb`):

```
altura: 40px
fundo: off (#F7F7F2)
borda-inferior: 1px rgba(10,21,56,0.07)
texto: ink/42 normal → ink/82 bold no último item
separador: › em ink/30
```

**Especificação Page wrapper:**
```
bg: off (#F7F7F2)
content padding: 28px
título da página: 28px, weight 500, letter-spacing -0.03em, ink
subtítulo/context: 11px mono uppercase, ink/42, letter-spacing 0.08em
```

**Restrições:**
- Rotas em `App.tsx` permanecem as mesmas — só muda o wrapper visual
- O `<Outlet />` do react-router deve continuar funcionando

---

## FASE 1 — Componentes Primitivos (rodam em paralelo)

### 1-A · Agente Primitivas UI

**Tarefa:** Criar/refatorar os componentes reutilizáveis do Trilho Design System.

**Referência:** `design/source/shared.jsx`

**Componentes a criar/refatorar:**

#### `src/components/trilho/Card.tsx`
```tsx
// props: padding? (default 20), className?, children
// border: 1px solid rgba(10,21,56,0.07)
// radius: 16px (rounded-lg)
// bg: white
// shadow: 0 1px 4px rgba(10,21,56,0.06)
```

#### `src/components/trilho/KPI.tsx`
```tsx
// props: label, value, sub?, trend?, spark?, gauge?
// label: 10px mono uppercase, letter-spacing 0.12em, ink/42
// value: 32px, weight 500, letter-spacing -0.03em, ink
// trend positivo: esmeralda-dark bg soft, texto esmeralda-dark
// trend negativo: danger bg soft, texto danger
// sparkline inline se fornecida
```

#### `src/components/trilho/ScoreGauge.tsx`
```tsx
// props: score (0-1000), size? (default 120)
// semicírculo SVG
// tier calculado: ≥800=AAA, ≥700=AA, ≥600=A, ≥500=BBB, ≥400=BB, ≥300=B, ≥200=C, else D
// cor da trilha: mapa tier → esmeralda/amarelo/laranja/vermelho
// valor centralizado em mono bold
// tier label abaixo
```

#### `src/components/trilho/StatusBadge.tsx`
```tsx
// props: status (string)
// mapeamento de status → {bg, fg} usando tokens tier/status
// radius: pill (999px)
// padding: 3px 10px
// tamanho texto: 11px, weight 500, letter-spacing 0.06em
```

#### `src/components/trilho/Sparkline.tsx`
```tsx
// props: data (number[]), w? (120), h? (36), color? (esmeralda)
// SVG path com área preenchida em gradiente
```

#### `src/components/trilho/SectionTitle.tsx`
```tsx
// props: children, action?
// título: 14px, weight 500, ink
// action: alinhado à direita
// borda-inferior: hairline (rgba 0.05) com padding-bottom 10px
```

#### `src/components/trilho/DataTable.tsx`
```tsx
// props: cols [{key, label, width?}], rows (object[])
// header: cinza-soft bg, 11px mono uppercase, letter-spacing 0.08em
// linhas: hairline divider, hover bg off/50
// células: 13px, ink
```

#### `src/components/trilho/Logo.tsx`
```tsx
// props: size? ('sm'|'md'|'lg'), variant? ('full'|'mark')
// 'full': símbolo + wordmark "Trilho." (ponto em esmeralda)
// 'mark': apenas símbolo (2 trilhos + nó)
// cores: branco sobre marinho (topbar), marinho sobre paper (light contexts)
```

**Restrições:**
- Criar em `src/components/trilho/` — não modificar `src/components/ui/`
- Exportar todos por `src/components/trilho/index.ts`

---

### 1-B · Agente Componentes de Domínio

**Tarefa:** Refatorar os componentes de domínio existentes para usar os tokens Trilho.

**Referência:** `design/source/screens-1.jsx`, `screens-2.jsx`, `screens-3.jsx`

**Componentes a refatorar:**

#### `src/components/StatusBadge.tsx`
- Substituir mapeamento de cores sink por tokens trilho
- Adicionar tiers de crédito (AAA, AA, A, BBB, BB, B, C, D)

#### `src/components/ScoreGauge.tsx`
- Refatorar usando a nova especificação acima (semicírculo + tier)

#### `src/components/AIInsightsPanel.tsx`
- Adaptar cores para paleta Trilho (fundo paper, accent esmeralda)

#### `src/components/FinancialIndicatorsPanel.tsx`
- Grid 2×4 (8 índices), usar Card trilho, tokens ink, border trilho

#### `src/components/RiskRadarChart.tsx`
- Manter lógica Recharts, atualizar cores para esmeralda/marinho

#### `src/components/ConcentrationChart.tsx`
- Atualizar cores para paleta Trilho

#### `src/components/RiskIndicator.tsx`
- Adaptar para tokens trilho

**Restrições:**
- Manter todas as props existentes — só mudar estilos
- Não alterar lógica de cálculo

---

## FASE 2 — Páginas (grupos paralelos)

### Grupo 2-A · Módulo Painel (pode rodar em paralelo com 2-B e 2-C)

#### `src/pages/Dashboard.tsx`
**Referência:** `design/references/Trilho Cred Sistema.html` → seção "Painel"
**Referência JSX:** `design/source/screens-1.jsx` → `ScreenPainel`

Layout:
```
<Page title="Painel" breadcrumbs={["Painel"]} active="Painel">
  <!-- Row 1: 4 KPIs -->
  <Grid cols={4}>
    <KPI label="EXPOSIÇÃO TOTAL" value="R$ 48,2M" sub="312 operações" trend="+6,4%" spark={[...]} />
    <KPI label="SAÚDE DA CARTEIRA" gauge={847} sub="Score médio ponderado" />
    <KPI label="SCORE MÉDIO" value="847" trend="+12 pts" spark={[...]} />
    <KPI label="TAXA APROVAÇÃO" value="73%" sub="Últ. 30 dias" spark={[...]} />
  </Grid>

  <!-- Row 2: Funil + Tendências -->
  <Grid cols="1.4fr 1fr">
    <Card title="Esteira de Decisão">
      <!-- Funil: Cedentes → Em análise → Em comitê → Aprovadas → Operações ativas -->
      <!-- Barras proporcionais ao volume, último item em esmeralda -->
    </Card>
    <Card title="Tendências">
      <!-- 3 linhas de tendência com sparkline + valor + variação -->
    </Card>
  </Grid>

  <!-- Row 3: Top Cedentes -->
  <Card title="Top Cedentes">
    <DataTable cols={[Nome, Exposição, Score, Tier, Status, Limite]} rows={...} />
  </Card>
</Page>
```

---

### Grupo 2-B · Módulo Crédito (pode rodar em paralelo com 2-A e 2-C)

#### `src/pages/ConsultaCPFCNPJ.tsx`
**Referência:** `design/source/screens-1.jsx` → `ScreenConsulta`

Layout:
```
<Page title="Consulta" breadcrumbs={["Crédito", "Consulta"]} active="Crédito">
  <!-- Input CNPJ com botão Consultar -->
  <!-- Grid 3 cols: Dados Cadastrais | Sócios | Endereço -->
  <!-- Grid 4 cols: Blacklist | Protestos | Score | Restrições SPC (indicadores com semáforo) -->
  <!-- Ações: Iniciar Análise | Criar Cedente | Transformar em Prospect -->
</Page>
```

#### `src/pages/CreditAnalysisList.tsx` (Cedentes)
**Referência:** `design/source/screens-1.jsx` → `ScreenCedentes`

Layout:
```
<Page title="Cedentes" breadcrumbs={["Crédito", "Cedentes"]} active="Crédito">
  <!-- Kanban 6 colunas -->
  <!-- Prospecção | Cadastro | Documentos | Análise | Comitê | Aprovado -->
  <!-- Cards: razão social + CNPJ + score mini + exposição + tags -->
  <!-- cursor grab, drag-and-drop -->
</Page>
```

Estágios Kanban Trilho (atualizar de 4 para 6):
- `cadastrado` → Cadastro
- `draft` → Documentos
- `in_committee` → Comitê
- `approved` → Aprovado
- `approved_restricted` → (badge no card Aprovado)
- `rejected` → (card volta para Documentos)

#### `src/pages/CreditAnalysisForm.tsx` (Análise)
**Referência:** `design/source/screens-2.jsx` → `ScreenAnalise`

Layout:
```
<Page title={nomeEmpresa} breadcrumbs={["Crédito", "Cedentes", nomeEmpresa]} active="Crédito">
  <!-- Header: Score gauge + tier + recomendação motor + ações -->
  <!-- 7 abas: Resumo | Análises | Cadastrais | Restrições | Documentos | Insights IA | Histórico -->
  <!-- Conteúdo principal 2 colunas (1.4fr + 1fr) -->
    <!-- Esquerda: Radar de risco + Concentração HHI + 8 índices financeiros -->
    <!-- Direita sidebar: 4 Insights IA + Documentos + Checklist -->
</Page>
```

#### `src/pages/CommitteeVoting.tsx` (Comitê)
**Referência:** `design/source/screens-2.jsx` → `ScreenComite`

Layout:
```
<Page title="Comitê" breadcrumbs={["Crédito", "Comitê"]} active="Crédito">
  <!-- Grid 2 cols -->
  <!-- Esquerda: Score + recomendação + pontos-chave (✓/⊙) -->
  <!-- Direita: Histórico de votos em tempo real + Painel de votação -->
    <!-- Botões: Aprovar (esmeralda) | Pedir mais info (warn) | Rejeitar (danger) -->
    <!-- Campo obrigatório de observação -->
    <!-- Quórum: X/N votaram -->
</Page>
```

---

### Grupo 2-C · Módulo Comercial + Monitoramento (pode rodar em paralelo com 2-A e 2-B)

#### `src/pages/CRMDashboard.tsx`
**Referência:** `design/source/screens-2.jsx` → `ScreenCRMDashboard`

Layout:
```
<Page title="Painel Comercial" breadcrumbs={["Comercial", "Painel"]} active="Comercial">
  <!-- 4 KPIs: Pipeline total | Forecast mês | Tarefas pendentes | Atividades semana -->
  <!-- Grid 2 cols: Forecast vs Realizado (barras) | Ranking comerciais -->
  <!-- Tabela atividades recentes -->
</Page>
```

#### `src/pages/CRMPipeline.tsx`
**Referência:** `design/source/screens-3.jsx` → `ScreenCRMPipeline`

Layout:
```
<Page title="Pipeline" breadcrumbs={["Comercial", "Pipeline"]} active="Comercial">
  <!-- Kanban 5 estágios: Prospecção | Qualificação | Proposta | Negociação | Ganho -->
  <!-- Cards: empresa + valor + probabilidade% + dias-em-estágio + avatar responsável -->
</Page>
```

#### `src/pages/ClientHistory.tsx` (Perfil de Cliente)
**Referência:** `design/source/screens-3.jsx` → `ScreenCRMCliente`

Layout:
```
<Page title={nomeCliente} breadcrumbs={["Comercial", "Clientes", nomeCliente]} active="Comercial">
  <!-- 3 context cards: Risco (score+tier) | Comercial (volume) | NFs (status) -->
  <!-- 8 abas: Visão geral | Análises | Oportunidades | Contatos | Atividades | Tarefas | NFs | Docs -->
  <!-- Grid 2 cols: tabelas à esquerda | sidebar contatos + timeline à direita -->
</Page>
```

#### `src/pages/InvoiceMonitoring.tsx`
**Referência:** `design/source/screens-3.jsx` → `ScreenNFs`

Layout:
```
<Page title="Monitoramento de NFs" breadcrumbs={["Monitoramento", "NFs"]} active="Monitoramento">
  <!-- 4 KPIs: NFs ativas | Volume monitorado | Atrasos | Concentração -->
  <!-- Filtros: Todas | A vencer | Atrasado | Vencido -->
  <!-- Tabela: ID | Cedente | Sacado | Valor | Vencimento | Status -->
  <!-- Sidebar direita: 14 alertas + grupos de monitoramento -->
</Page>
```

#### `src/pages/PipelinePerformance.tsx` *(nova página)*
**Referência:** `design/source/screens-3.jsx` → `ScreenPerformance`

Layout:
```
<Page title="Performance da Esteira" breadcrumbs={["Monitoramento", "Performance"]} active="Monitoramento">
  <!-- 4 KPIs: Tempo médio total | Taxa aprovação | Estagnadas >7d | SLA cumprido -->
  <!-- Tempo por etapa: barra horizontal sequencial (cadastro→doc→análise→comitê→decisão→operação) -->
  <!-- Aviso gargalo: se etapa > meta, highlight danger -->
  <!-- Tabela estagnadas: empresa + etapa + dias + analista + ação -->
  <!-- Ranking analistas: nome + qtd análises + tempo médio + aprovação% + SLA% -->
</Page>
```

**Rota nova a adicionar em `App.tsx`:**
```tsx
<Route path="/monitoramento/performance" element={<PipelinePerformance />} />
```

**Item novo a adicionar na Topbar — módulo Monitoramento:**
- NFs → `/monitoramento/nfs`
- Performance → `/monitoramento/performance`

---

## FASE 3 — Validação

### 3-A · Smoke Test Visual

**Checklist antes de considerar migração concluída:**

- [ ] Topbar aparece em todas as rotas autenticadas
- [ ] Sidebar antiga não aparece em nenhuma rota
- [ ] Background da app é off-paper (`#F7F7F2`), não dark
- [ ] Cards são brancos com borda sutil
- [ ] Nenhuma classe `sink-*` restante em `src/pages/` ou `src/components/` (exceto arquivos ui/)
- [ ] StatusBadge renderiza todos os 9 status corretamente
- [ ] ScoreGauge renderiza semicírculo com tier correto
- [ ] KPIs com sparkline renderizam sem erro
- [ ] Auth.tsx mantém seu design próprio (não usar Topbar)
- [ ] `npm run build` sem erros de tipo

### 3-B · Agente Testes E2E

**Fluxos críticos a cobrir:**
1. Login → redireciona para Dashboard
2. Dashboard → 4 KPIs visíveis
3. Crédito → Cedentes → Kanban com 6 colunas
4. Crédito → Análise → 7 abas navegáveis
5. Comitê → 3 botões de voto aparecem
6. Comercial → Pipeline → Kanban com 5 colunas
7. Monitoramento → NFs → filtros funcionam

---

## Ordem de Execução Recomendada

```
FASE 0 (paralelo, ~2h cada):
  0-A · Tokens          → tailwind.config.ts + index.css
  0-B · Layout Shell    → Topbar + Breadcrumb + App.tsx

FASE 1 (paralelo, ~3h cada, após 0-A e 0-B):
  1-A · Primitivas UI   → Card, KPI, ScoreGauge, StatusBadge, Sparkline, DataTable, Logo
  1-B · Domínio Comp.   → refatorar componentes existentes com novos tokens

FASE 2 (grupos paralelos, ~2h por grupo, após FASE 1):
  2-A · Dashboard
  2-B · Módulo Crédito  (Consulta + Cedentes + Análise + Comitê)
  2-C · Comercial + Monitoramento (CRM Dashboard + Pipeline + Cliente + NFs + Performance)

FASE 3 (após FASE 2):
  3-A · Smoke test visual
  3-B · E2E Playwright
```

**Total estimado:** 2 sessões de trabalho paralelo (FASE 0+1 = sessão 1 / FASE 2+3 = sessão 2)

---

## Referências Rápidas

| O que precisar | Onde buscar |
|---|---|
| Paleta de cores exata | `design/tokens.json` |
| Componente específico em código | `design/source/shared.jsx` |
| Tela renderizada para comparar | `design/references/Trilho Cred Sistema.html` |
| Props e exemplos de uso | `design/COMPONENTS.md` |
| Especificação completa | `design/README.md` |
