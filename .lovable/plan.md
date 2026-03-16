

## Módulo de Análise de Crédito e Comitê de Crédito

### Visão Geral
Sistema de análise de crédito para empresas de antecipação de recebíveis (factoring/securitizadora/FIDC), com relatório estruturado e comitê de votação. Sem autenticação por enquanto — foco total nas telas e fluxo.

---

### 1. Banco de Dados (Lovable Cloud)

**Tabelas a criar:**

- **clients** (Cedentes): id, cnpj_cpf, razao_social, nome_fantasia, data_fundacao, segmento, cidade, estado, created_at
- **credit_analysis**: id, client_id (FK), responsavel_comercial, analista_credito, data_analise, faturamento_medio, volume_estimado, prazo_medio_titulos, historico_socios (text), credit_score, protestos, pendencias, cheques_sem_fundo, acoes_judiciais, observacoes_credito, analise_faturamento, estrutura_financeira, endividamento, dependencia_clientes, riscos (text), pontos_positivos (text), limite_sugerido (decimal), prazo_medio_permitido, concentracao_maxima (decimal), garantias (text), parecer_analista (text), recommendation (enum: approve/restrict/reject), status (enum: draft/in_committee/approved/approved_restricted/rejected), operational_data (JSONB), financial_analysis (JSONB), final_limit, final_concentration, created_at
- **credit_analysis_sacados**: id, credit_analysis_id (FK), sacado_nome, percentual_faturamento, prazo_medio
- **credit_analysis_socios**: id, credit_analysis_id (FK), nome, cpf, participacao, cargo
- **credit_committee**: id, credit_analysis_id (FK), member_name, member_role, vote (enum: approve/restrict/reject), observation, vote_date, created_at
- **committee_result**: id, credit_analysis_id (FK), limite_aprovado, prazo_aprovado, concentracao_maxima, condicoes_adicionais, decisao_final, created_at

---

### 2. Telas e Navegação

**Layout:** Sidebar com navegação principal → Dashboard, Cedentes, Relatórios de Crédito, Comitê de Crédito.

#### A. Cadastro de Cedentes
- Listagem com busca e filtro
- Formulário de cadastro/edição (CNPJ, razão social, dados de endereço, segmento)

#### B. Relatório de Crédito (Tela principal — formulário full-page)
- **Navegação lateral (scroll-spy):** Identificação → Operacional → Estrutura Societária → Consulta de Crédito → Análise Financeira → Riscos/Positivos → Operação Proposta → Parecer
- **Tabelas dinâmicas** inline-editáveis para Sacados e Sócios (adicionar/remover linhas)
- **Campos financeiros** com formatação BRL e `tabular-nums`
- **Recomendação:** Toggle group [Aprovar | Aprovar c/ Restrição | Reprovar]
- **Botão "Enviar para Comitê"** → muda status para "Em Comitê" com confirmação via toast

#### C. Comitê de Crédito — Fila
- Lista de relatórios com status "Em Comitê"
- Colunas: Cliente, CNPJ, Limite, Analista, Data, Status
- Botão "Abrir Análise"

#### D. Votação do Comitê (Split View)
- **Painel esquerdo (60%):** Resumo read-only do relatório (dados financeiros, riscos, parecer)
- **Painel direito (40%):** Widget de votação
  - Número de membros configurável por sessão
  - Cada voto: Nome, Cargo, Voto (toggle group), Observação
  - Lista de votos já registrados
  - **Motor de maioria automático:** calcula resultado ao completar todos os votos (empate → opção mais conservadora)
  - Resultado final com campos: Limite aprovado, Prazo, Concentração, Condições

#### E. Históricos
- Histórico de análises por cedente
- Histórico de decisões do comitê com auditoria (quem votou, quando, decisão)

---

### 3. Funcionalidades Adicionais
- **Exportar PDF:** Stylesheet limpa preto-e-branco para impressão do relatório
- **Status badges** com cores distintas (Rascunho/Em Comitê/Aprovado/Reprovado)
- **Auditoria completa:** timestamps em todas as ações

---

### 4. Design
- Interface densa estilo "workbench financeiro" com tipografia Inter
- Cores neutras (slate/navy), badges coloridos por status
- Cards com sombras sutis, sem bordas sólidas
- Formatação brasileira: moeda BRL, datas dd/mm/aaaa, CNPJ com máscara

