
# CRM Integrado à Plataforma de Crédito

## Objetivo
Transformar a plataforma em um hub completo que une **Análise de Crédito + Monitoramento de Risco + CRM Comercial**, permitindo gestão do ciclo de vida completo do cliente — da prospecção ao monitoramento contínuo.

---

## Fase 1 — Infraestrutura de Dados (Banco)

### Novas tabelas:
- **contacts** — Contatos vinculados a clientes (nome, email, telefone, cargo, departamento, é decisor?)
- **deals** — Oportunidades/negócios no funil (cliente, valor estimado, stage, probabilidade, responsável, data prevista de fechamento)
- **deal_stages** — Etapas configuráveis do funil comercial (nome, ordem, cor)
- **activities** — Registro de interações (tipo: ligação/email/reunião/visita, descrição, data, contato vinculado, deal vinculado)
- **tasks** — Tarefas e follow-ups (título, descrição, responsável, data limite, prioridade, status, vinculado a cliente/deal)
- **tags** — Sistema de tags para segmentação
- **client_tags** — Relação N:N entre clientes e tags

---

## Fase 2 — Módulos do CRM

### 2.1 Gestão de Contatos
- Lista de contatos por cliente com filtros
- Ficha do contato com histórico de interações
- Marcar contato como decisor/influenciador

### 2.2 Pipeline Comercial (Funil de Vendas)
- Kanban de oportunidades com drag-and-drop
- Stages configuráveis (Prospecção → Qualificação → Proposta → Negociação → Fechado/Ganho → Fechado/Perdido)
- Métricas: valor total por stage, taxa de conversão, forecast

### 2.3 Atividades e Interações
- Timeline unificada por cliente (ligações, emails, reuniões, visitas)
- Registro rápido de atividade
- Vinculação com contatos e oportunidades

### 2.4 Tarefas e Follow-ups
- Lista de tarefas com filtros por prioridade/status/responsável
- Notificações de tarefas vencidas no sino
- Vinculação com clientes e deals

### 2.5 Tags e Segmentação
- Tags customizáveis com cores
- Filtro por tags na lista de clientes
- Segmentação para ações em lote

---

## Fase 3 — Integração Crédito ↔ CRM

- Ao aprovar crédito, criar automaticamente um deal no funil
- Exibir score de crédito e status na ficha CRM do cliente
- Alertas de monitoramento (blacklist, falimentar) visíveis na timeline do cliente
- Dashboard unificado com métricas de CRM + Crédito

---

## Fase 4 — Dashboard CRM

- KPIs: deals abertos, valor do pipeline, tarefas pendentes, atividades da semana
- Funil visual com valores por stage
- Ranking de responsáveis comerciais
- Forecast de receita

---

## Navegação
- Novo grupo no menu: **"CRM"** com subitens: Pipeline, Contatos, Atividades, Tarefas
- Integração com busca global existente
