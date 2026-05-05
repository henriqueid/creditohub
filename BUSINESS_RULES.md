# Business Rules — CreditoHub

> Documento gerado em 2026-05-04. Cobre todas as 30 páginas da aplicação.
> Stack: React + TypeScript + Supabase. Roteador: react-router-dom v6.

---

## Auth · /auth
**Propósito:** Tela pública de autenticação com login, cadastro e recuperação de senha.
**Dados:** `supabase.auth` (signInWithPassword, signUp, resetPasswordForEmail), `profiles`
**Ações:** Login, Cadastro, Solicitar reset de senha
**Regras:**
- Três modos internos: `login`, `signup`, `forgot`
- Ao criar conta via signup, o `full_name` é passado como metadata do usuário
- Após login ou signup bem-sucedido, redireciona para `/`
- Reset de senha envia e-mail com `redirectTo: /reset-password`
**Validações:**
- Email e senha obrigatórios para login/signup
- Erros do Supabase Auth exibidos via toast
**Navega para:** `/` (após autenticação), `/reset-password` (via e-mail)

---

## ResetPassword · /reset-password
**Propósito:** Tela pública para definir nova senha após clicar no link de recovery enviado por e-mail.
**Dados:** `supabase.auth.updateUser`
**Ações:** Atualizar senha
**Regras:**
- Só exibe o formulário se a URL contiver `type=recovery` no hash
- Se o hash for inválido ou ausente, exibe mensagem de "link inválido ou expirado"
- Senha mínima de 6 caracteres (atributo `minLength` no input)
**Validações:**
- Senha obrigatória; mínimo 6 caracteres
- Após sucesso, redireciona para `/`
**Navega para:** `/` (após reset), `/auth` (link de volta no estado de erro)

---

## Dashboard · /
**Propósito:** Painel central com visão executiva de todo o sistema, organizado em quatro abas: Visão Geral, Crédito, CRM e Monitoramento.
**Dados:**
- `credit_analysis` (status, limite_sugerido, credit_score, analista_credito, recommendation, faturamento_medio + join `clients`)
- `clients` (contagem total)
- `committee_result` (decisao_final, limite_aprovado)
- `blacklist` (últimos 50)
- `bankruptcy_records` (últimos 50)
- `monitored_invoices` (últimos 200)
- `monitoring_groups` + `monitoring_group_clients`
- `deals` + `deal_stages`
- `crm_tasks`
- `profiles` (usuário logado)
- `activities` (últimas 10)
**Ações:** Visualizar KPIs, filtrar por período (7d/30d/90d/Tudo), navegar para outras telas
**Regras:**
- **Saúde da Carteira** = `(clientCount - bankruptcyMatched - blacklistCount) / clientCount × 100`
- **Score tier:** ≥ 800 = AAA, ≥ 700 = AA, ≥ 600 = A, else = B
- **Cor do score:** ≥ 700 = verde (aprovado), ≥ 400 = amarelo (comitê), < 400 = vermelho (rejeitado)
- **Saúde da Esteira de Crédito:** "good" se inCommittee = 0 e drafts ≤ 2; "danger" se inCommittee > 3 ou drafts > 5; "warning" nos demais
- **Saúde CRM:** "good" se overdueTasks = 0; "danger" se overdueTasks > 3; "warning" nos demais
- **Saúde Monitoramento:** "good" se invoiceInvalid = 0 e bankruptcyMatched = 0; "danger" se invoiceInvalid > 5 ou bankruptcyMatched > 2
- **Exposição Total** = limite_aprovado (comitê) + valor pipeline ativo
- **Taxa de Aprovação** = aprovadas / (aprovadas + reprovadas)
- **Funil:** Cedentes → Análises → Em Comitê → Aprovadas (mostra % de conversão entre etapas)
- **Tendências:** compara últimas 4 semanas vs. 4 semanas anteriores (sparklines de 8 semanas)
- Status `approved_restricted` é contado como aprovado mas exibido separadamente
- Gargalo fixo em "Comitê (2,1d)" e "Tempo médio 4,2d" são valores estáticos (placeholder)
**Validações:** Nenhuma (tela read-only)
**Navega para:** `/analises`, `/analises/nova`, `/cedentes`, `/comite`, `/crm/dashboard`, `/crm/pipeline`, `/crm/tarefas`, `/crm/atividades`, `/monitoramento-nfs`, `/falimentar`, `/blacklist`, `/performance`

---

## Clients (Cedentes) · /cedentes
**Propósito:** Lista todos os cedentes em formato Kanban (padrão) ou Tabela. O Kanban espelha o pipeline de crédito com 6 colunas baseadas no status da última análise.
**Dados:**
- `clients` (todos os campos)
- `credit_analysis` (id, client_id, status, limite_sugerido, credit_score — para determinar etapa do kanban)
- `client_tags` + `tag_definitions` (via `ClientTagManager` / `useAllClientTags`)
**Ações:**
- Visualizar cedentes (Kanban ou Tabela)
- Buscar por nome, CNPJ ou nome fantasia
- Filtrar por tags
- Arrastar card de coluna para avançar etapa
- Criar nova análise (arrastar de "Cadastrado" → "Em Análise")
- Enviar para comitê (arrastar de "Em Análise" → "Em Comitê")
- Re-analisar (arrastar de "Reprovado" → "Em Análise")
- Editar cadastro (ícone lápis)
- Ver histórico (ícone relógio)
**Regras:**
- **Estágios Kanban:** `cadastrado` (sem análise) → `draft` (em análise) → `in_committee` → `approved` / `approved_restricted` / `rejected`
- **Transições permitidas via drag:**
  - `cadastrado` → `draft`: cria análise nova com status `draft` e redireciona para `/analises/:id`
  - `draft` → `in_committee`: atualiza status da análise para `in_committee` e redireciona para `/comite/:id`
  - `rejected` → `draft`: cria nova análise (re-análise)
  - Demais transições via drag são bloqueadas com toast de erro
- Análise em comitê (`in_committee`) NÃO pode ser movida via drag — apenas pela tela de votação
- Estados `approved` e `approved_restricted` não permitem transições via drag
- O status do card é determinado pela **última análise** do cedente (ordenada por `created_at` desc)
- Cedente sem análise aparece na coluna "Cadastrado"
- Clicar no card em modo Kanban navega para `/crm/cliente/:id` (perfil CRM)
- Ícone de lápis navega para `/cedentes/:id` (edição do cadastro)
- Ícone de histórico navega para `/cedentes/:id/historico`
**Validações:**
- Drag para destino inválido: toast de erro com mensagem específica
- Se `latestAnalysisId` for nulo ao tentar enviar para comitê: toast de erro
**Navega para:** `/cedentes/novo`, `/cedentes/:id`, `/cedentes/:id/historico`, `/analises/:id`, `/comite/:id`, `/crm/cliente/:id`

---

## ClientForm (Formulário de Cedente) · /cedentes/novo e /cedentes/:id
**Propósito:** Criar ou editar um cedente. Suporta pré-preenchimento com dados da Receita Federal vindos da tela de consulta.
**Dados:**
- `clients` (insert/update)
- `credit_analysis` (insert — apenas quando "Iniciar análise de crédito" está marcado)
- `credit_analysis_socios` (insert — quando há snapshot da consulta)
- `profiles` (leitura indireta via ConsultaSnapshot)
**Ações:**
- Cadastrar novo cedente
- Editar cedente existente
- Gerenciar tags (modo edição apenas)
- Opcionalmente iniciar análise de crédito junto ao cadastro
**Regras:**
- Se a rota contiver `:id`, o formulário está em modo edição
- Se vier com `location.state.prefill`, os campos são pré-preenchidos com dados da Receita Federal (vindo de `/consulta`)
- Se vier com `location.state.snapshot` (ConsultaSnapshot), ao criar a análise os dados são populados via `snapshotToCreditAnalysis()` e os sócios via `insertSnapshotSocios()`
- Se `prefill.razao_social` existir, o checkbox "Iniciar análise de crédito" é marcado automaticamente
- Ao salvar com "Iniciar análise": cria cedente → cria análise → redireciona para `/analises/:id`
- Ao salvar sem "Iniciar análise": cria/atualiza cedente → redireciona para `/cedentes`
- `cnpj_cpf` é salvo sem formatação (apenas dígitos)
- Tags só aparecem no modo edição
**Validações:**
- `razao_social` e `cnpj_cpf` são obrigatórios — toast de erro se ausentes
- Erros do Supabase exibidos via toast com mensagem detalhada
**Navega para:** `/cedentes` (após salvar), `/analises/:id` (se iniciar análise), navegação de volta (`navigate(-1)`)

---

## ClientHistory (Histórico do Cedente) · /cedentes/:id/historico
**Propósito:** Exibe a linha do tempo completa de um cedente: todas as análises, votos do comitê, resultados, deals CRM, atividades e tarefas.
**Dados:**
- `clients` (dados cadastrais)
- `credit_analysis` (todas as análises do cedente)
- `credit_committee` (votos — filtrados pelos IDs das análises)
- `committee_result` (resultados — filtrados pelos IDs das análises)
- `deals` + `deal_stages` (oportunidades do cliente)
- `activities` (atividades registradas)
- `crm_tasks` (tarefas)
**Ações:** Visualizar timeline, clicar em análise para abrir (`/analises/:id`)
**Regras:**
- A timeline é construída mesclando e ordenando por data (desc) eventos de 7 fontes diferentes
- Tipos de evento: `analysis_created`, `status_change`, `vote`, `committee_result`, `deal_created`, `activity`, `task`
- Votos são agrupados por `credit_analysis_id` e buscados apenas se houver análises
- Tarefas concluídas usam `completed_at` como data; não concluídas usam `created_at`
- Análises com status diferente de `draft` geram um evento adicional de `status_change`
**Validações:** Nenhuma (tela read-only)
**Navega para:** `/cedentes` (botão voltar), `/analises/:id` (ao clicar em uma análise)

---

## CreditAnalysisList · /analises
**Propósito:** Lista todas as análises de crédito com status, analista, limite sugerido e vínculo com pipeline CRM.
**Dados:**
- `credit_analysis` + join `clients` (razao_social, cnpj_cpf)
- `deals` + `deal_stages` (para coluna "Pipeline" — agrupados por `credit_analysis_id`)
**Ações:** Visualizar lista, criar nova análise, abrir análise existente, acessar pipeline CRM
**Regras:**
- A coluna "Pipeline" mostra o valor total e contagem de deals vinculados à análise via `credit_analysis_id`
- Clicar em qualquer linha navega para `/analises/:id`
- O botão de pipeline abre `/crm/pipeline` (stopPropagation para não abrir a análise)
- Ordenado por `created_at` desc
**Validações:** Nenhuma (tela read-only com criação)
**Navega para:** `/analises/nova`, `/analises/:id`, `/crm/pipeline`

---

## CreditAnalysisForm · /analises/nova e /analises/:id
**Propósito:** Formulário completo de análise de crédito — o "dossiê" do cedente. É a tela mais complexa do sistema, com múltiplas seções colapsáveis, upload de arquivos por seção, IA para extração de dados e métricas calculadas em tempo real.
**Dados:**
- `credit_analysis` (insert/update — campo principal)
- `credit_analysis_sacados` (insert/delete/update — sacados da operação)
- `credit_analysis_socios` (insert/delete/update — quadro societário)
- `credit_analysis_attachments` (upload/download por seção)
- `credit_analysis_insights` (gerados por IA)
- `clients` (seleção do cedente)
**Ações:**
- Criar nova análise (modo `/nova`)
- Editar análise existente (modo `/:id`)
- Salvar rascunho
- Enviar para comitê (muda status para `in_committee`)
- Imprimir/exportar PDF
- Adicionar/remover sacados
- Adicionar/remover sócios
- Upload de arquivos por seção (balancete, contrato social, etc.)
- Gerar insights de IA (via `AIInsightsPanel`)
**Regras:**
- **Score e Limite calculados automaticamente:**
  - `classifyRisk(score)` → classificação de risco
  - `suggestLimit(faturamentoMedio, score)` → limite sugerido automático
  - `calculateConcentration(sacados)` → concentração e HHI
  - `calculateSociosTotal(socios)` → participação total dos sócios
  - `suggestRate(score, prazo)` → taxa sugerida
  - `calculateOverallRiskScore(radar)` → score de risco geral
  - `calculateFinancialRatios(...)` → índices financeiros (cobertura dívida, receita/fat, limite/fat)
- **Status permitidos:** `draft`, `in_committee`, `approved`, `approved_restricted`, `rejected`
- **Recomendação do analista:** `approve`, `restrict`, `reject`
- A IA pode preencher automaticamente campos como score, protestos, pendências, ações judiciais, faturamento, sócios, riscos e pontos positivos ao extrair dados de um arquivo
- Upload de arquivo por seção: o arquivo é enviado ao Supabase Storage e a IA pode extrair dados estruturados dele
- Campos numéricos como `cnpj_cpf`, `faturamento_medio`, `limite_sugerido`, `capital_social`, `receita_liquida` são convertidos para número antes de salvar
- `data_fundacao` e `data_analise` são tratados como `null` se vazios
- Modo compacto (`compactMode`): seções mostram apenas resumo; clicar expande
- Seções colapsáveis com animação (framer-motion)
**Validações:**
- `client_id` obrigatório para salvar (implícito — sem cliente não há análise)
- Erros do Supabase exibidos via toast
- Sacados e sócios têm validação básica de campo obrigatório (`sacado_nome`, `nome` do sócio)
**Navega para:** `/analises` (botão voltar/cancelar), `/comite/:id` (ao enviar para comitê)

---

## CommitteeQueue (Fila do Comitê) · /comite
**Propósito:** Lista todas as análises com status `in_committee` aguardando votação.
**Dados:**
- `credit_analysis` (filtrado por `status = 'in_committee'`) + join `clients`
**Ações:** Visualizar fila, abrir análise para votação
**Regras:**
- Exibe apenas análises com status exato `in_committee`
- Ordenado por `updated_at` desc (mais recentemente enviadas ao topo)
- Botão "Abrir Análise" navega para `/comite/:id`
**Validações:** Nenhuma
**Navega para:** `/comite/:id`

---

## CommitteeVoting · /comite/:id
**Propósito:** Tela de votação do comitê de crédito para uma análise específica. Exibe dossiê resumido à esquerda e painel de votação à direita.
**Dados:**
- `credit_analysis` + join `clients` (completo, com todos os campos do dossiê)
- `credit_analysis_sacados` (sacados com concentração/HHI)
- `credit_analysis_socios` (quadro societário)
- `credit_analysis_insights` (pareceres de IA: `summary`, `risk`)
- `credit_committee` (votos registrados)
- `committee_result` (resultado existente — para estado "já finalizado")
- `deal_stages` (para criar deal automaticamente na aprovação)
- `deals` (insert automático)
**Ações:**
- Visualizar dossiê resumido (abas: Resumo, Restrições, Sacados, Parecer IA)
- Registrar voto individual
- Configurar número de membros do comitê
- Finalizar decisão do comitê (quando todos votaram)
**Regras:**
- **Cálculo do resultado por maioria:** conta votos `approve`, `restrict`, `reject`; o tipo com maior contagem vence
  - Maioria `approve` → status `approved`
  - Maioria `restrict` → status `approved_restricted`
  - Maioria `reject` → status `rejected`
  - Em caso de empate: `approved_restricted`
- **Finalizar decisão:**
  1. Insere em `committee_result` (limite_aprovado, prazo, concentração, condições, decisao_final)
  2. Atualiza `credit_analysis.status` para a decisão final
  3. Se aprovado (`approved` ou `approved_restricted`): cria deal automaticamente no CRM no primeiro estágio ativo
- O botão de finalizar só aparece quando `votes.length >= totalMembers`
- O formulário de voto some após atingir o número de membros configurado
- Se `existingResult` existe ou a análise não está mais em `in_committee`, a tela mostra apenas o resultado (modo somente leitura)
- **Restrições exibidas no dossiê:** campos `protestos`, `pendencias`, `acoes_judiciais`, `cheques_sem_fundo`, `restricoes_cnpj` — mostrados apenas se diferentes de "nada consta" / "0" / vazio
- **Concentração:** calculada via `calculateConcentration(sacados)` — mostra HHI e alertas
**Validações:**
- Nome do membro e voto obrigatórios para registrar voto
- Voto só pode ser `approve`, `restrict` ou `reject`
**Navega para:** `/comite` (botão voltar), `/analises/:id` (link "Abrir Dossiê Completo")

---

## ConsultaCPFCNPJ · /consulta
**Propósito:** Consulta 360° de um CPF ou CNPJ: verifica base interna (cedentes, análises, votos, sócios), fontes externas (BrasilAPI / Receita Federal) e blacklist. Gera qualificação automática de prospect.
**Dados:**
- `blacklist` (verificação imediata ao consultar)
- `clients` (busca por `cnpj_cpf`)
- `credit_analysis` (todas as análises do cliente encontrado)
- `committee_result` (resultados do comitê)
- `credit_committee` (votos)
- `credit_analysis_socios` (para CPF: verifica participações societárias)
- `prospects` (insert/update via `saveProspectQualification`)
- BrasilAPI / API Própria (via `fetchExternalConsulta`)
**Ações:**
- Consultar CPF ou CNPJ
- Visualizar dados cadastrais, análises, votos e restritivos internos
- Visualizar dados da Receita Federal (externo)
- Visualizar participações societárias (CPF)
- Cadastrar cedente pré-preenchido com dados da RF
- Gerar qualificação automática de prospect
**Regras:**
- Documento mínimo 11 dígitos para habilitar consulta
- **Alerta de blacklist:** exibido imediatamente (banner vermelho proeminente) se o documento estiver bloqueado
- **Qualificação automática:** ao final do carregamento, executa `qualifyProspect()` e salva resultado em `prospects` com `expires_at` baseado em `prospect_qualification_validity_days` (system_settings)
- Status de qualificação: `qualified` (score ≥ 60), `not_qualified` (score < 30), `pending` (intermediário)
- Risco derivado do melhor score interno: ≥ 700 = low, ≥ 400 = medium, < 400 = high
- Se CNPJ não está na base interna mas existe na Receita Federal: exibe dados externos + botão "Cadastrar Cedente (dados pré-preenchidos)"
- CPF: aba adicional "Participações" mostra empresas onde o CPF aparece como sócio
- `ConsultaSnapshot` é construído consolidando dados externos e passado ao cadastrar cedente (`location.state.snapshot`)
- Dados externos exibem: dados cadastrais, endereço, CNAEs, Simples Nacional/MEI, regime tributário, score externo, protestos, sócios
**Validações:**
- Mínimo 11 dígitos (CPF) para habilitar busca
- Botão desabilitado enquanto carregando
**Navega para:** `/cedentes/novo` (pré-preenchido), `/analises/:id` (link para análise existente), `/blacklist`

---

## Blacklist · /blacklist
**Propósito:** Gestão da lista de CPFs e CNPJs bloqueados para operações de crédito.
**Dados:** `blacklist` (todos os campos)
**Ações:**
- Listar documentos bloqueados
- Buscar por CPF/CNPJ
- Adicionar documento à blacklist
- Remover documento da blacklist (com confirmação)
**Regras:**
- `tipo` é determinado automaticamente: CPF se 11 dígitos, CNPJ se 14 dígitos
- Documento armazenado apenas com dígitos (sem formatação)
- Tentativa de inserir documento duplicado retorna erro específico (código `23505`)
- Exibe contadores separados de CPFs e CNPJs bloqueados
**Validações:**
- Documento deve ter exatamente 11 (CPF) ou 14 (CNPJ) dígitos
- Documento duplicado: toast de erro "Documento já está na blacklist"
- Remoção exige confirmação via AlertDialog
**Navega para:** Nenhuma (tela autossuficiente)

---

## Prospects · /prospects
**Propósito:** Lista de leads pré-qualificados automaticamente pelo motor de crédito (gerados via `/consulta`). Permite converter prospect qualificado em cedente.
**Dados:**
- `prospects` (todos os campos incluindo `qualification_data`, `expires_at`, `client_id`)
- `system_settings` (para `prospect_qualification_validity_days`)
- `clients`, `deals`, `deal_stages` (na conversão)
**Ações:**
- Listar prospects com status, score e risco
- Buscar por documento ou nome
- Converter prospect qualificado em cedente
- Reconsultar (navega para `/consulta?doc=...`)
- Remover prospect
**Regras:**
- Prospects são gerados automaticamente pela tela `/consulta` — não podem ser criados manualmente aqui
- **Conversão de prospect para cedente:**
  1. Verifica se cliente já existe na base (por `cnpj_cpf`)
  2. Se já existe: apenas vincula `client_id` no prospect
  3. Se não existe: cria cedente usando `snapshotToClient(snapshot)` ou dados básicos
  4. Se há `snapshot`: cria análise de crédito pré-preenchida e insere sócios
  5. Se prospect está `qualified`: cria deal automaticamente no CRM no primeiro estágio ativo
- Prospects expirados (campo `expires_at` no passado) ficam com opacidade 60% e label "(expirado)"
- Botão de conversão aparece apenas para prospects `qualified` sem `client_id` (não convertidos)
- Botão "Ver Cedente" aparece apenas para prospects com `client_id` (já convertidos)
**Validações:**
- Conversão bloqueada se já existir `client_id` vinculado
**Navega para:** `/crm/cliente/:id` (após conversão ou ao ver cedente), `/consulta` (nova consulta / reconsultar)

---

## InvoiceMonitoring · /monitoramento-nfs
**Propósito:** Monitoramento de notas fiscais dos cedentes e gestão de grupos de monitoramento com alertas configuráveis.
**Dados:**
- `monitored_invoices` + join `clients`
- `credit_analysis_sacados` (para referência cruzada de sacados)
- `monitoring_groups` (CRUD completo)
- `monitoring_group_clients` (vínculo grupo ↔ cedente)
- `clients` (listagem para filtros e seleção nos grupos)
**Ações:**
- Visualizar notas fiscais (filtrar por cedente)
- Upload de notas (XML/CSV)
- Criar/editar/excluir grupos de monitoramento
- Configurar parâmetros do grupo (limiar de variação, atraso, concentração, volume mínimo, alertas)
- Associar cedentes a grupos
**Regras:**
- NFs têm status: `pending`, `valid`, `invalid`, `cancelled`, `not_found`
- Grupos têm frequência: `daily`, `weekly`, `monthly`
- Ao salvar grupo: remove todos os vínculos `monitoring_group_clients` existentes e reinsere os selecionados
- Gráficos de barras e linhas para volume de NFs por mês/semana
- Parâmetros do grupo: `limiar_variacao` (%), `limiar_atraso_dias` (dias), `concentracao_maxima` (%), `volume_minimo` (R$)
- Alertas: `alerta_email` (booleano) e `alerta_sistema` (booleano)
**Validações:**
- Nome do grupo obrigatório
- Erros exibidos via toast
**Navega para:** Nenhuma (tela autossuficiente)

---

## BankruptcyReport · /falimentar
**Propósito:** Registro e consulta de informes falimentares (falência, recuperação judicial, recuperação extrajudicial, liquidação). Faz cruzamento automático com cedentes e sacados da carteira.
**Dados:**
- `bankruptcy_records` + join `clients` (matched_client_id)
- `clients` (para cruzamento de CNPJ/razão social)
- `credit_analysis_sacados` (para cruzamento de sacados)
**Ações:**
- Listar registros falimentares
- Buscar por nome ou documento
- Filtrar por tipo (falência, recuperação judicial, etc.)
- Criar/editar/excluir registro
**Regras:**
- **Cruzamento automático ao salvar:** compara `company_name` e `document` com:
  - `clients.cnpj_cpf` e `clients.razao_social` → popula `matched_client_id`
  - `credit_analysis_sacados.sacado_nome` → popula `matched_sacado_names`
- Se houver coincidência com cedente ou sacado da carteira: toast de aviso com nomes dos envolvidos
- Tipos: `falencia`, `recuperacao_judicial`, `recuperacao_extrajudicial`, `liquidacao`
- Status: `em_andamento`, `deferido`, `indeferido`, `encerrado`
- Source padrão: `manual`
**Validações:**
- `company_name` e `type` obrigatórios (implícito pela interface)
- Erros exibidos via toast
**Navega para:** Nenhuma (tela autossuficiente)

---

## Settings · /configuracoes
**Propósito:** Central de configurações do sistema com 6 abas: Perfil, Geral, Aprovação, Automação, Integrações e Acessos.
**Dados:**
- `system_settings` (todas as chaves da tabela, CRUD por `key`)
- `profiles` (leitura e atualização do perfil do usuário logado)
- `integration_configs` (CRUD de integrações — aba Integrações)
**Ações:**
- Editar perfil pessoal (nome, cargo)
- Configurar dados da empresa (nome, CNPJ)
- Definir thresholds de score (aprovação automática, rejeição automática)
- Configurar parâmetros de operação (concentração máxima, prazo máximo, taxa padrão, limite mínimo)
- Ativar/desativar automações (blacklist check, cálculo de score, envio ao comitê, notificações, follow-up)
- Configurar dias de follow-up e validade de qualificação de prospects
- Criar/editar/excluir integrações externas
- Visualizar papéis disponíveis (Acessos — placeholder)
**Regras:**
- `auto_approve_score` — score acima deste valor aprova automaticamente
- `auto_reject_score` — score abaixo deste valor rejeita automaticamente
- Faixa intermediária (entre reject e approve) vai para análise manual
- `dirty` flag controla se o botão "Salvar Alterações" está habilitado
- Valores são convertidos: `"true"/"false"` → boolean, numérico → number, else → string
- Banner no topo leva para `/configuracoes/motor`
**Validações:**
- `min_committee_members`: número entre 1 e 20
- `max_concentration`: número entre 1 e 100
- Integração: `name` obrigatório
**Navega para:** `/configuracoes/motor` (banner e link)

---

## CreditEngineSettings · /configuracoes/motor
**Propósito:** Configuração detalhada do motor de crédito: regras por tipo, pesos, parâmetros de score, faixas e políticas de decisão.
**Dados:** `credit_engine_rules` (CRUD completo — todos os campos incluindo `parameters` JSONB)
**Ações:**
- Visualizar regras agrupadas por `rule_type`
- Editar parâmetros de cada regra (campos dinâmicos conforme `rule_type`)
- Ativar/desativar regras individualmente
- Salvar todas as alterações de uma vez
- Resetar ao estado salvo (descarta edições locais)
**Regras:**
- Regras agrupadas por `rule_type`: `score_weight`, `limit_policy`, `rate_policy`, `decision_threshold`, etc.
- Dentro de cada grupo, ordenadas por `priority`
- Parâmetros são JSONB — campos renderizados dinamicamente baseados nas chaves do objeto `parameters`
- `dirty` flag: botão Salvar só habilitado se houver alterações
- Somente `parameters`, `is_active` e `description` são atualizáveis (não `rule_name`, `rule_type`, `priority`)
**Validações:** Nenhuma explícita (parâmetros numéricos e booleanos)
**Navega para:** `/configuracoes` (botão voltar)

---

## BureauSettings · /configuracoes/bureaus
**Propósito:** Gestão dos provedores de bureau de crédito (Serasa, Boa Vista, SPC, Quod, etc.) com configuração de credenciais e teste de conexão.
**Dados:** `bureau_providers` (CRUD completo)
**Ações:**
- Listar provedores configurados (ordenados por prioridade)
- Criar/editar/excluir provedor
- Ativar/desativar provedor
- Testar consulta real ao bureau (informar documento e tipo de consulta)
**Regras:**
- Provedores disponíveis: `mock`, `serasa`, `boavista`, `spc`, `quod`, `assertiva`, `bigdatacorp`
- Tipos de consulta suportados: `score`, `protestos`, `acoes_judiciais`, `restritivos`, `pendencias_financeiras`, `consultas_recentes`
- Campos por provedor: `provider_type`, `nome`, `credential_secret_name`, `base_url`, `ativo`, `prioridade`, `tipos_consulta`, `custo_medio_consulta`
- `credential_secret_name` referencia variável de ambiente/secret no servidor (não armazena token diretamente)
- Teste de consulta usa `consultarBureau(providerId, documento, tipo)` da lib `bureau-client`
- Prioridade determina a ordem de chamada quando múltiplos bureaus estão ativos
**Validações:**
- `provider_type` e `nome` obrigatórios
- Resultado do teste exibido em modal
**Navega para:** `/configuracoes` (botão voltar)

---

## PipelineMetrics · /performance
**Propósito:** Métricas detalhadas do pipeline de análises de crédito: funil de conversão, distribuição por status, tempo médio de processamento, análise por analista e evolução temporal.
**Dados:**
- `credit_analysis` (id, status, created_at, updated_at, credit_score, recommendation, analista_credito, limite_sugerido + join `clients`)
- `credit_committee` (votos: credit_analysis_id, vote, vote_date)
- `committee_result` (resultados: credit_analysis_id, decisao_final, created_at)
**Ações:**
- Filtrar por período (7d, 30d, 90d, Tudo)
- Visualizar métricas calculadas
**Regras:**
- **Funil:** Draft → In Committee → Decisão → Aprovação
- **Taxa de aprovação** = aprovadas / decididas
- **Taxa de rejeição** = rejeitadas / decididas
- **Conversão rascunho → comitê** = (inCommittee + decididas) / total
- **Conversão comitê → decisão** = decididas / (inCommittee + decididas)
- **Score médio**: média dos credit_score de todas as análises no período
- **Tempo médio de processamento**: `daysDiff(created_at, updated_at)` por análise
- **Análise por analista**: agrupa por `analista_credito` (quantidade, aprovações, taxa)
- **Evolução temporal**: conta análises por semana nas últimas 8–12 semanas
- **Distribuição de votos**: conta `approve`, `restrict`, `reject` de `credit_committee`
- Gráficos SVG simples (sparklines) e barras customizadas
- `cutoff` calculado como `now - periodDays * 24h`
**Validações:** Nenhuma (tela read-only)
**Navega para:** Nenhuma

---

## AuditLog · /audit-log
**Propósito:** Registro de auditoria de todas as alterações feitas no sistema (insert, update, delete) nas tabelas críticas.
**Dados:**
- `audit_log` (últimas 500 entradas, desc)
- `profiles` (para mapear `changed_by` → nome do usuário)
**Ações:**
- Visualizar log de auditoria
- Filtrar por tabela, tipo de ação e texto livre
- Paginação (25 por página)
- Abrir detalhe de uma entrada (exibe `old_data` e `new_data` em JSON)
**Regras:**
- Tabelas auditadas mapeadas: `credit_analysis`, `blacklist`, `credit_engine_rules`, `system_settings`, `committee_result`, `monitoring_groups`
- Ações: `insert`, `update`, `delete`
- `changed_by` é um UUID de usuário; resolvido para nome via `profiles`
- Paginação local: 25 registros por página sobre os 500 carregados
- Busca por: tabela, nome de usuário ou `record_id`
**Validações:** Nenhuma (tela read-only)
**Navega para:** Nenhuma

---

## Integrations · /integracoes
**Propósito:** Tela dedicada de gestão de integrações com sistemas externos (duplica a aba Integrações de Settings, mas como página full).
**Dados:** `integration_configs` (CRUD completo)
**Ações:**
- Listar integrações
- Criar/editar integração
- Excluir integração
- Testar integração (botão existe mas está disabled)
**Regras:**
- Tipos suportados: `export_cadastro`, `webhook`, `api_sync`
- Tipos de autenticação: `bearer`, `basic`, `api_key`, `none`
- `auth_secret_name` = nome da variável de ambiente que contém o token/chave
- `is_active` determina se a integração está ativa
- Funcionalidade idêntica à aba "Integrações" em `/configuracoes` — duplicação de código
**Validações:** `name` obrigatório
**Navega para:** Nenhuma

---

## PatrimonialReport · /patrimonial
**Propósito:** Registro e consulta de bens patrimoniais dos cedentes (imóveis, veículos, participações societárias, aplicações financeiras, equipamentos).
**Dados:**
- `patrimonial_info` + join `clients`
- `clients` (para seleção e filtro)
**Ações:**
- Listar itens patrimoniais (filtrar por cedente)
- Criar/editar/excluir item patrimonial
**Regras:**
- Tipos: `imovel`, `veiculo`, `participacao_societaria`, `aplicacao_financeira`, `equipamento`, `outro`
- Cada item vinculado a um `client_id`
- Campos: tipo, descrição, valor estimado, proprietário, documento do proprietário, matrícula/registro, localização, observações
- Filtro por cedente no topo da tela
- Ordenado por `created_at` desc
**Validações:**
- `client_id` e `tipo` obrigatórios (implícito pelo formulário)
**Navega para:** Nenhuma (tela autossuficiente)

---

## CRMPipeline · /crm/pipeline
**Propósito:** Kanban de oportunidades comerciais (deals) distribuídas por estágios do funil de vendas. Integra status de crédito diretamente nos cards.
**Dados:**
- `deal_stages` (ativos, ordenados por `order`)
- `deals` + join `clients`
- `clients` (para seleção ao criar deal)
- `credit_analysis` (para mostrar status de crédito no card)
**Ações:**
- Visualizar pipeline em Kanban
- Criar novo deal (modal)
- Mover deal entre estágios via drag-and-drop
- Editar deal
- Excluir deal (com AlertDialog)
- Abrir perfil CRM do cliente
**Regras:**
- **Estágios:** definidos em `deal_stages` com flags `is_won`, `is_lost`, `is_active`
- **Guard de movimentação:** antes de mover deal para outro estágio, verifica status de crédito do cliente
  - Se cliente tem análise `rejected` ou `approved_restricted`: exibe aviso (dialog de guarda)
  - Se cedente está em análise (`draft` ou `in_committee`): exibe aviso
  - Deal pode ser movido mesmo com aviso (não bloqueia)
- Deal criado automaticamente pelo comitê ao aprovar (`CommitteeVoting`)
- Deal criado automaticamente ao converter prospect qualificado (`Prospects`)
- Valor padrão do deal = `limite_sugerido` da análise vinculada
- Responsável padrão = `responsavel_comercial` ou `analista_credito` da análise
- **Badge de crédito no card:** exibe status da última análise do cliente (Em Análise, Aprovado, Reprovado, etc.)
**Validações:**
- `title` e `client_id` obrigatórios para criar deal
**Navega para:** `/crm/cliente/:id` (ao clicar no card)

---

## CRMContacts · /crm/contatos
**Propósito:** Gestão de contatos (pessoas físicas) vinculados aos cedentes. Identifica tomadores de decisão.
**Dados:**
- `contacts` + join `clients` (razao_social)
- `clients` (para seleção ao criar contato)
**Ações:**
- Listar contatos com busca (por nome, email ou empresa)
- Criar contato
- Editar contato
- Excluir contato
- Navegar para perfil CRM do cedente vinculado
**Regras:**
- Campos: `name`, `email`, `phone`, `role`, `department`, `is_decision_maker`, `notes`, `client_id`
- `is_decision_maker`: flag booleana — exibida com destaque (ícone estrela)
- Busca por `name`, `email` ou `clients.razao_social`
- Contato pode ser criado sem vínculo com cedente (client_id opcional)
**Validações:**
- `name` obrigatório (implícito)
**Navega para:** `/crm/cliente/:id` (link para o cedente do contato)

---

## CRMActivities · /crm/atividades
**Propósito:** Registro e visualização de atividades comerciais (ligações, emails, reuniões, notas, mensagens) por cedente.
**Dados:**
- `activities` + join `clients` + join `contacts`
- `clients` (para seleção)
- `profiles` (usuário logado — preenche `created_by` automaticamente)
**Ações:**
- Listar atividades (filtrar por tipo, dono — minhas/equipe, busca por texto)
- Criar atividade
- Deletar atividade
**Regras:**
- Tipos de atividade: `call` (Ligação), `email` (Email), `meeting` (Reunião), `note` (Nota), `message` (Mensagem)
- `created_by` pré-preenchido com `profiles.full_name` do usuário logado
- Filtro "Minhas": compara `created_by` com nome do perfil logado
- Filtro "Equipe": todas exceto as do usuário logado
- `activity_date` padrão = `now()` (definido no Supabase)
- Exibe últimas 100 atividades, ordenadas por `activity_date` desc
**Validações:**
- `client_id` e `activity_type` obrigatórios (implícito)
**Navega para:** Nenhuma (tela autossuficiente)

---

## CRMTasks · /crm/tarefas
**Propósito:** Gestão de tarefas comerciais com prioridade, status, responsável e prazo. Criadas manualmente ou automaticamente por follow-up.
**Dados:**
- `crm_tasks` + join `clients`
- `clients` (para seleção)
**Ações:**
- Listar tarefas (filtrar por status — padrão: `pending`)
- Buscar por título
- Criar tarefa
- Alternar status (pending → in_progress → completed)
- Excluir tarefa
**Regras:**
- Status: `pending`, `in_progress`, `completed`
- Prioridades: `low` (Baixa), `medium` (Média), `high` (Alta)
- Ao marcar como `completed`: define `completed_at = now()`
- Ao desmarcar `completed`: limpa `completed_at`
- `due_date` opcional — tarefas vencidas destacadas no Dashboard
- `assigned_to` opcional — nome textual do responsável
- Tarefas podem ser criadas automaticamente via automação de follow-up (configurável em Settings)
**Validações:**
- `title` obrigatório
**Navega para:** Nenhuma (tela autossuficiente)

---

## CRMDashboard · /crm/dashboard
**Propósito:** Painel analítico do CRM com KPIs de pipeline, gráficos de evolução, distribuição por estágio e performance da equipe.
**Dados:**
- `deal_stages` (ativos)
- `deals` + join `clients`
- `crm_tasks` (count de pending/in_progress)
- `activities` (count da última semana)
- `contacts` (count total)
**Ações:** Visualizar KPIs e gráficos, navegar para outras telas CRM
**Regras:**
- **Pipeline ativo**: deals em estágios que não são `is_won` nem `is_lost`
- **Valor pipeline**: soma dos `value` de deals ativos
- **Won rate**: `wonDeals.length / totalDeals × 100`
- **Valor médio por deal**: `totalWonValue / wonDeals.length`
- **Distribuição por estágio**: deals agrupados por `stage_id` com contagem e valor
- **Tendência por semana**: conta novos deals por semana (últimas 8 semanas)
- **Performance por responsável**: agrupa por `responsible` — contagem, valor, ganhos
- Gráficos: BarChart (por estágio), LineChart/AreaChart (evolução), PieChart (distribuição)
**Validações:** Nenhuma (tela read-only)
**Navega para:** `/crm/pipeline`, `/crm/tarefas`, `/crm/atividades`, `/crm/contatos`

---

## CRMClientProfile · /crm/cliente/:id
**Propósito:** Perfil completo de um cedente no contexto CRM: dados cadastrais, score de crédito, deals, contatos, atividades, tarefas, alertas de blacklist e falimentar, e estatísticas de NFs.
**Dados:**
- `clients` (dados cadastrais)
- `credit_analysis` (última análise e lista de todas)
- `deals` + `deal_stages`
- `contacts`
- `activities` (últimas 15)
- `crm_tasks` (últimas 10)
- `blacklist` (verifica pelo `cnpj_cpf` do cliente)
- `bankruptcy_records` (filtrado por `matched_client_id`)
- `monitored_invoices` (estatísticas: total, válidas, inválidas, pendentes)
- `client_tags` (via `ClientTagManager`)
**Ações:**
- Visualizar perfil completo (abas: Crédito, Deals, Contatos, Atividades, Tarefas)
- Editar cadastro (navega para `/cedentes/:id`)
- Abrir análise de crédito (navega para `/analises/:id`)
- Adicionar atividade (navega para `/crm/atividades`)
- Gerenciar tags
**Regras:**
- **Alerta de blacklist**: exibido em destaque se o documento do cliente estiver na blacklist
- **Alerta falimentar**: exibido se houver registros em `bankruptcy_records` com `matched_client_id = id`
- **Score gauge**: exibe o score da última análise visualmente
- **Status de crédito**: derivado do status da última análise
- **Saúde das NFs**: percentual de inválidas sobre o total
- Tags gerenciadas inline via `ClientTagManager`
- Atividades limitadas a 15, tarefas a 10
**Validações:** Nenhuma (maioria read-only; edição delegada a outras telas)
**Navega para:** `/cedentes/:id` (editar), `/analises/:id`, `/crm/atividades`, `/cedentes/:id/historico`

---

## NotFound · /*
**Propósito:** Página 404 para rotas não encontradas.
**Dados:** Nenhum
**Ações:** Exibir mensagem de erro
**Regras:** Captura qualquer rota não definida via `path="*"`
**Validações:** Nenhuma
**Navega para:** `/` (link de volta)

---

# Tabelas Supabase — Referência Rápida

| Tabela | Usado em |
|---|---|
| `clients` | Cedentes, ClientForm, Dashboard, Consulta, CRM* |
| `credit_analysis` | AnalysisList, AnalysisForm, Committee*, Dashboard, Consulta, CRM* |
| `credit_analysis_sacados` | AnalysisForm, CommitteeVoting, BankruptcyReport, InvoiceMonitoring |
| `credit_analysis_socios` | AnalysisForm, CommitteeVoting, Consulta |
| `credit_analysis_attachments` | AnalysisForm (por seção) |
| `credit_analysis_insights` | AnalysisForm, CommitteeVoting (IA) |
| `credit_committee` | CommitteeVoting, ClientHistory, Consulta, PipelineMetrics |
| `committee_result` | CommitteeVoting, ClientHistory, Consulta, Dashboard, PipelineMetrics |
| `blacklist` | Blacklist, Consulta, Dashboard, CRMClientProfile |
| `bankruptcy_records` | BankruptcyReport, Dashboard, CRMClientProfile |
| `monitored_invoices` | InvoiceMonitoring, Dashboard, CRMClientProfile |
| `monitoring_groups` + `monitoring_group_clients` | InvoiceMonitoring, Dashboard |
| `deals` + `deal_stages` | CRMPipeline, CRMDashboard, CommitteeVoting, ClientHistory, CRMClientProfile, Dashboard |
| `contacts` | CRMContacts, CRMClientProfile |
| `activities` | CRMActivities, ClientHistory, Dashboard, CRMClientProfile |
| `crm_tasks` | CRMTasks, Dashboard, ClientHistory, CRMClientProfile |
| `prospects` | Prospects, Consulta |
| `system_settings` | Settings, CreditEngineSettings |
| `credit_engine_rules` | CreditEngineSettings |
| `integration_configs` | Integrations, Settings |
| `bureau_providers` | BureauSettings |
| `patrimonial_info` | PatrimonialReport |
| `audit_log` | AuditLog |
| `profiles` | Auth, Settings, AuditLog, Dashboard, CRMActivities |
| `client_tags` + `tag_definitions` | Clients (kanban), CRMClientProfile |

---

# Status Flow — credit_analysis

```
draft → in_committee → approved
                     → approved_restricted
                     → rejected → draft (re-análise)
```

**Gatilhos de transição:**
- `draft` → `in_committee`: drag no Kanban de Cedentes OU botão na AnalysisForm
- `in_committee` → decisão final: apenas via CommitteeVoting (finalizeMutation)
- `rejected` → `draft`: drag no Kanban (cria nova análise) OU botão na AnalysisForm

---

# Regras Globais de Negócio

1. **Blacklist tem prioridade máxima**: verificada na Consulta antes de qualquer dado ser exibido; bloqueio visível e persistente.
2. **Comitê é inviolável**: status `in_committee`, `approved`, `approved_restricted` e `rejected` não podem ser alterados via drag no Kanban — apenas pela tela de votação.
3. **Deal automático na aprovação**: ao finalizar o comitê com `approved` ou `approved_restricted`, um deal é criado automaticamente no CRM no primeiro estágio ativo.
4. **Prospect qualificado vira deal automaticamente**: ao converter um prospect `qualified` em cedente, um deal é criado no CRM.
5. **Snapshot da Receita Federal propaga dados**: a `ConsultaSnapshot` criada na consulta é passada via `location.state` para ClientForm e Prospects, pré-preenchendo análise e sócios.
6. **Score determina cor e tier em todo o sistema**: ≥ 700 = verde/Tier AA+, 400–699 = amarelo/comitê, < 400 = vermelho/rejeição.
7. **Auditoria automática**: alterações em tabelas críticas são registradas em `audit_log` via triggers do Supabase (não controlado no frontend).
8. **Tags de cedente**: gerenciadas via `ClientTagManager` — disponíveis no Kanban de Cedentes e no perfil CRM.
