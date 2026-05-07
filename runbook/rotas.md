## Rotas & Mapa de telas

| Rota | Page | Submenu | Função |
|---|---|---|---|
| `/` | Dashboard | — | Painel inicial: alertas, KPIs, top cedentes |
| `/auth` | Auth | — | Login/signup/forgot |
| `/perfil` | Profile | — | Conta + chave Anthropic |
| `/configuracoes` | Settings | — | Empresa, políticas, requisitos comitê, automações, integrações, acessos, **membros do comitê** (CRUD admin) |
| `/configuracoes/motor` | CreditEngineSettings | — | Pesos do motor |
| `/configuracoes/bureaus` | BureauSettings | — | Bureaus configurados |
| `/consulta` | ConsultaCPFCNPJ | Comercial | Busca CNPJ (BrasilAPI + bureau + base) |
| `/prospects` | Prospects | Comercial | Inbox de leads pré-qualificados |
| `/crm/dashboard` | CRMDashboard | Comercial | Painel comercial (funil + ranking) |
| `/crm/pipeline` | CRMPipeline | Comercial | Kanban de deals (DnD) |
| `/crm/deal/:id` | DealDetail | Comercial | Página dedicada de deal (mesmo conteúdo que `DealDetailSheet`) |
| `/crm/contatos` | CRMContacts | Comercial | Lista de contatos |
| `/crm/atividades` | CRMActivities | Comercial | Atividades |
| `/crm/tarefas` | CRMTasks | Comercial | Tarefas |
| `/crm/cliente/:id` | CRMClientProfile | Comercial | (Legacy — será deprecado em favor de `/cedentes/:id/perfil`) |
| `/analises` | CreditAnalysisList | Crédito | Kanban de análises (DnD com sync ao Pipeline) |
| `/analises/nova` | CreditAnalysisForm | Crédito | Form (acessível só com warning) |
| `/analises/:id` | CreditAnalysisForm | Crédito | Dossiê (9 seções + 5 abas) |
| `/comite` | CommitteeQueue | Crédito | Pauta do comitê |
| `/comite/:id` | CommitteeVoting | Crédito | Tela de votação |
| `/cedentes` | Clients | Crédito | Portfólio (tabs por status) |
| `/cedentes/:id` | ClientForm | Crédito | Edição cadastral |
| `/cedentes/:id/perfil` | CedenteProfile | Crédito | Perfil 360° (NOVO) |
| `/cedentes/:id/historico` | ClientHistory | Crédito | Histórico de análises |
| `/cedentes/novo` | ClientForm | Crédito | Cadastro novo |
| `/blacklist` | Blacklist | Crédito | CNPJs bloqueados |
| `/monitoramento-nfs` | InvoiceMonitoring | Monitoramento | NFs monitoradas |
| `/monitoramento/performance` | PipelinePerformance | Monitoramento | Performance |
| `/falimentar` | BankruptcyReport | Crédito | Falimentar |
| `/patrimonial` | PatrimonialReport | — | Patrimonial |
| `/integracoes` | Integrations | — | Integrações |
| `/audit-log` | AuditLog | — | Log de auditoria |
| `/performance` | PipelineMetrics | — | Métricas |
