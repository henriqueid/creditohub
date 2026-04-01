
# Plano de Reestruturação — Plataforma de Inteligência de Crédito

Baseado na análise dos concorrentes (Vadu/Dimensa, Neoway, GYRA+, Serasa Powercurve, Neocredit), mapeei as funcionalidades essenciais e organizei em fases.

---

## 🔄 FASE 1 — Motor de Crédito + Branding (AGORA)

### 1.1 Branding → "Ambiente Teste"
- Remover logo Sink e substituir por texto "Ambiente Teste"
- Atualizar título da página e sidebar

### 1.2 Motor de Crédito Parametrizável (Configurações)
Criar uma seção robusta em Configurações com:

**Regras e Políticas (parametrizáveis):**
- **Faixas de Score**: definir ranges customizáveis (ex: 0-200 = D, 200-400 = C, etc.)
- **Pesos por dimensão**: cada variável do radar de risco com peso configurável
- **Limites automáticos**: % do faturamento por faixa de score
- **Taxa sugerida**: taxa base por faixa + ajuste por prazo
- **Regras de corte automático** (auto-reject): score mínimo, protestos acima de X, pendências, tempo mínimo de atividade
- **Regras de aprovação automática** (auto-approve): score acima de Y, sem restritivos, tempo mínimo
- **Concentração máxima permitida** por sacado
- **Prazo máximo de títulos**

**Tabela no banco:** `credit_engine_rules` com campos:
- `rule_name`, `rule_type` (score_range, weight, limit, rate, cutoff, auto_approve), `parameters` (JSONB), `is_active`, `priority`

### 1.3 Execução do Motor
- Quando um prospect é convertido, o motor roda automaticamente com os dados da API
- Gera: Score interno, Classificação (AAA-D), Limite sugerido, Taxa sugerida, Alertas automáticos
- IA analisa o conjunto e gera parecer complementar (usando Lovable AI / Gemini)

---

## 🔄 FASE 2 — Fluxo Consulta → Prospect → Análise (PRÓXIMO)

### 2.1 Reestruturar Consulta CPF/CNPJ
- Consulta busca em TODAS as fontes configuradas
- Exibe pré-avaliação rápida (semáforo: verde/amarelo/vermelho)
- Botão "Transformar em Prospect" (novo status antes de Cedente)

### 2.2 Novo conceito: Prospect
- Prospect = lead qualificado, ainda não é cedente
- Ao virar prospect, roda o motor de crédito automaticamente
- Se aprovado pelo motor → vira Cedente com análise iniciada
- Se reprovado → fica como prospect rejeitado (pode ser reavaliado)

### 2.3 Pipeline visual
- Consulta → Prospect → Em Análise → Comitê → Aprovado/Rejeitado

---

## 🔄 FASE 3 — Monitoramento (DEPOIS)

### 3.1 Grupos de Monitoramento
- Criar grupos (ex: "Carteira Ativa", "Prospects VIP", "Alto Risco")
- Adicionar CPFs/CNPJs a grupos
- Definir periodicidade por grupo (diário, semanal, mensal)

### 3.2 Parâmetros de Alerta
- Alteração de score
- Novos protestos/pendências
- Mudança de situação cadastral (CNPJ)
- Entrada na blacklist
- Vencimento de análise

### 3.3 Canais de Notificação (configuráveis)
- Notificação interna (sino no sistema)
- E-mail
- WhatsApp (via Twilio)

---

## 🔄 FASE 4 — Dashboard de Inteligência (DEPOIS)

### 4.1 Novo Dashboard
- Visão consolidada da carteira
- Distribuição de risco (gráfico pizza/radar)
- Score médio da carteira
- Alertas ativos
- Pipeline de prospects
- Taxa de conversão (consulta → prospect → cedente)
- Monitoramento ativo (quantos CPFs/CNPJs monitorados)

---

## 📊 Nova Estrutura de Menu

```
📊 Dashboard (visão inteligência)
🔍 Consulta (CPF/CNPJ — busca + pré-avaliação)
👥 Prospects (pipeline de leads qualificados)
🏢 Cedentes (clientes ativos)
📋 Análises de Crédito (dossiês)
👨‍⚖️ Comitê de Crédito
📡 Monitoramento (grupos + alertas)
🚫 Blacklist
⚙️ Configurações (motor de crédito + regras + alertas)
```

---

## 🤖 IA no Motor de Crédito
- Lovable AI (Gemini) já está configurado no projeto
- Será usado para:
  - Gerar parecer automático baseado nos dados
  - Analisar tendências e padrões
  - Sugerir ajustes no motor baseado no histórico
  - Resumir dossiê para o comitê

---

**Recomendação**: Começar pela **Fase 1** (Motor de Crédito + Branding) que é o core da plataforma. As fases seguintes se constroem sobre ele.

Posso iniciar a implementação?
