export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          activity_date: string
          activity_type: string
          client_id: string
          contact_id: string | null
          created_at: string
          created_by: string | null
          deal_id: string | null
          description: string
          id: string
          tenant_id: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          client_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description: string
          id?: string
          tenant_id?: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          client_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          deal_id?: string | null
          description?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          tenant_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          tenant_id?: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bankruptcy_records: {
        Row: {
          company_name: string
          court: string | null
          created_at: string
          document: string | null
          filing_date: string | null
          id: string
          matched_client_id: string | null
          matched_sacado_names: string[] | null
          notes: string | null
          process_number: string | null
          source: string
          status: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          company_name: string
          court?: string | null
          created_at?: string
          document?: string | null
          filing_date?: string | null
          id?: string
          matched_client_id?: string | null
          matched_sacado_names?: string[] | null
          notes?: string | null
          process_number?: string | null
          source?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          court?: string | null
          created_at?: string
          document?: string | null
          filing_date?: string | null
          id?: string
          matched_client_id?: string | null
          matched_sacado_names?: string[] | null
          notes?: string | null
          process_number?: string | null
          source?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bankruptcy_records_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bankruptcy_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      blacklist: {
        Row: {
          adicionado_por: string | null
          created_at: string
          documento: string
          id: string
          motivo: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          adicionado_por?: string | null
          created_at?: string
          documento: string
          id?: string
          motivo?: string | null
          tenant_id?: string
          tipo: string
        }
        Update: {
          adicionado_por?: string | null
          created_at?: string
          documento?: string
          id?: string
          motivo?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "blacklist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_consultas: {
        Row: {
          consultado_em: string
          consultado_por: string | null
          custo_estimado: number | null
          documento: string
          error_message: string | null
          id: string
          provider_id: string | null
          provider_type:
            | Database["public"]["Enums"]["bureau_provider_type"]
            | null
          response_normalized: Json | null
          response_raw: Json | null
          status: Database["public"]["Enums"]["bureau_consulta_status"]
          tenant_id: string
          tipo_consulta: string
          validade_ate: string | null
        }
        Insert: {
          consultado_em?: string
          consultado_por?: string | null
          custo_estimado?: number | null
          documento: string
          error_message?: string | null
          id?: string
          provider_id?: string | null
          provider_type?:
            | Database["public"]["Enums"]["bureau_provider_type"]
            | null
          response_normalized?: Json | null
          response_raw?: Json | null
          status: Database["public"]["Enums"]["bureau_consulta_status"]
          tenant_id?: string
          tipo_consulta: string
          validade_ate?: string | null
        }
        Update: {
          consultado_em?: string
          consultado_por?: string | null
          custo_estimado?: number | null
          documento?: string
          error_message?: string | null
          id?: string
          provider_id?: string | null
          provider_type?:
            | Database["public"]["Enums"]["bureau_provider_type"]
            | null
          response_normalized?: Json | null
          response_raw?: Json | null
          status?: Database["public"]["Enums"]["bureau_consulta_status"]
          tenant_id?: string
          tipo_consulta?: string
          validade_ate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bureau_consultas_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "bureau_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bureau_consultas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bureau_providers: {
        Row: {
          ativo: boolean
          base_url: string | null
          created_at: string
          credential_secret_name: string | null
          custo_medio_consulta: number | null
          id: string
          nome: string
          observacoes: string | null
          prioridade: number
          provider_type: Database["public"]["Enums"]["bureau_provider_type"]
          tenant_id: string
          tipos_consulta: string[]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          base_url?: string | null
          created_at?: string
          credential_secret_name?: string | null
          custo_medio_consulta?: number | null
          id?: string
          nome: string
          observacoes?: string | null
          prioridade?: number
          provider_type: Database["public"]["Enums"]["bureau_provider_type"]
          tenant_id?: string
          tipos_consulta?: string[]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          base_url?: string | null
          created_at?: string
          credential_secret_name?: string | null
          custo_medio_consulta?: number | null
          id?: string
          nome?: string
          observacoes?: string | null
          prioridade?: number
          provider_type?: Database["public"]["Enums"]["bureau_provider_type"]
          tenant_id?: string
          tipos_consulta?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bureau_providers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tag_id: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tag_id: string
          tenant_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tag_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          cidade: string | null
          cnpj_cpf: string
          created_at: string
          data_fundacao: string | null
          estado: string | null
          id: string
          nome_fantasia: string | null
          razao_social: string
          segmento: string | null
          tenant_id: string
        }
        Insert: {
          cidade?: string | null
          cnpj_cpf: string
          created_at?: string
          data_fundacao?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social: string
          segmento?: string | null
          tenant_id?: string
        }
        Update: {
          cidade?: string | null
          cnpj_cpf?: string
          created_at?: string
          data_fundacao?: string | null
          estado?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social?: string
          segmento?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_result: {
        Row: {
          concentracao_maxima: number | null
          condicoes_adicionais: string | null
          created_at: string
          credit_analysis_id: string
          decisao_final: Database["public"]["Enums"]["credit_status"]
          id: string
          limite_aprovado: number | null
          prazo_aprovado: number | null
          tenant_id: string
        }
        Insert: {
          concentracao_maxima?: number | null
          condicoes_adicionais?: string | null
          created_at?: string
          credit_analysis_id: string
          decisao_final: Database["public"]["Enums"]["credit_status"]
          id?: string
          limite_aprovado?: number | null
          prazo_aprovado?: number | null
          tenant_id?: string
        }
        Update: {
          concentracao_maxima?: number | null
          condicoes_adicionais?: string | null
          created_at?: string
          credit_analysis_id?: string
          decisao_final?: Database["public"]["Enums"]["credit_status"]
          id?: string
          limite_aprovado?: number | null
          prazo_aprovado?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_result_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: true
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "committee_result_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          client_id: string
          created_at: string
          department: string | null
          email: string | null
          id: string
          is_decision_maker: boolean
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          department?: string | null
          email?: string | null
          id?: string
          is_decision_maker?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_analysis: {
        Row: {
          acoes_judiciais: string | null
          analise_faturamento: string | null
          analista_credito: string | null
          capital_social: number | null
          cheques_sem_fundo: string | null
          client_id: string
          concentracao_maxima: number | null
          condicoes_especiais: string | null
          created_at: string
          credit_score: number | null
          data_analise: string | null
          dependencia_clientes: string | null
          endividamento: string | null
          estrutura_financeira: string | null
          faturamento_detalhado: string | null
          faturamento_medio: number | null
          fonte_informacao: string | null
          garantias: string | null
          historico_pagamentos: string | null
          historico_socios: string | null
          id: string
          indice_liquidez: string | null
          limite_sugerido: number | null
          margem_liquida: string | null
          modalidade_operacao: string | null
          numero_funcionarios: number | null
          observacoes_credito: string | null
          parecer_analista: string | null
          pendencias: string | null
          pontos_positivos: string | null
          prazo_medio_permitido: number | null
          prazo_medio_titulos: number | null
          protestos: string | null
          receita_liquida: number | null
          recommendation:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          referencias_bancarias: string | null
          referencias_comerciais: string | null
          responsavel_comercial: string | null
          restricoes_cnpj: string | null
          riscos: string | null
          status: Database["public"]["Enums"]["credit_status"]
          taxa_sugerida: number | null
          tempo_atividade: string | null
          tenant_id: string
          tipo_imovel_sede: string | null
          updated_at: string
          volume_estimado: number | null
        }
        Insert: {
          acoes_judiciais?: string | null
          analise_faturamento?: string | null
          analista_credito?: string | null
          capital_social?: number | null
          cheques_sem_fundo?: string | null
          client_id: string
          concentracao_maxima?: number | null
          condicoes_especiais?: string | null
          created_at?: string
          credit_score?: number | null
          data_analise?: string | null
          dependencia_clientes?: string | null
          endividamento?: string | null
          estrutura_financeira?: string | null
          faturamento_detalhado?: string | null
          faturamento_medio?: number | null
          fonte_informacao?: string | null
          garantias?: string | null
          historico_pagamentos?: string | null
          historico_socios?: string | null
          id?: string
          indice_liquidez?: string | null
          limite_sugerido?: number | null
          margem_liquida?: string | null
          modalidade_operacao?: string | null
          numero_funcionarios?: number | null
          observacoes_credito?: string | null
          parecer_analista?: string | null
          pendencias?: string | null
          pontos_positivos?: string | null
          prazo_medio_permitido?: number | null
          prazo_medio_titulos?: number | null
          protestos?: string | null
          receita_liquida?: number | null
          recommendation?:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          referencias_bancarias?: string | null
          referencias_comerciais?: string | null
          responsavel_comercial?: string | null
          restricoes_cnpj?: string | null
          riscos?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
          taxa_sugerida?: number | null
          tempo_atividade?: string | null
          tenant_id?: string
          tipo_imovel_sede?: string | null
          updated_at?: string
          volume_estimado?: number | null
        }
        Update: {
          acoes_judiciais?: string | null
          analise_faturamento?: string | null
          analista_credito?: string | null
          capital_social?: number | null
          cheques_sem_fundo?: string | null
          client_id?: string
          concentracao_maxima?: number | null
          condicoes_especiais?: string | null
          created_at?: string
          credit_score?: number | null
          data_analise?: string | null
          dependencia_clientes?: string | null
          endividamento?: string | null
          estrutura_financeira?: string | null
          faturamento_detalhado?: string | null
          faturamento_medio?: number | null
          fonte_informacao?: string | null
          garantias?: string | null
          historico_pagamentos?: string | null
          historico_socios?: string | null
          id?: string
          indice_liquidez?: string | null
          limite_sugerido?: number | null
          margem_liquida?: string | null
          modalidade_operacao?: string | null
          numero_funcionarios?: number | null
          observacoes_credito?: string | null
          parecer_analista?: string | null
          pendencias?: string | null
          pontos_positivos?: string | null
          prazo_medio_permitido?: number | null
          prazo_medio_titulos?: number | null
          protestos?: string | null
          receita_liquida?: number | null
          recommendation?:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          referencias_bancarias?: string | null
          referencias_comerciais?: string | null
          responsavel_comercial?: string | null
          restricoes_cnpj?: string | null
          riscos?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
          taxa_sugerida?: number | null
          tempo_atividade?: string | null
          tenant_id?: string
          tipo_imovel_sede?: string | null
          updated_at?: string
          volume_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_analysis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_analysis_attachments: {
        Row: {
          ai_extracted_data: Json | null
          created_at: string
          credit_analysis_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          section: string
          tenant_id: string
        }
        Insert: {
          ai_extracted_data?: Json | null
          created_at?: string
          credit_analysis_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          section: string
          tenant_id?: string
        }
        Update: {
          ai_extracted_data?: Json | null
          created_at?: string
          credit_analysis_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          section?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_attachments_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_analysis_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_analysis_insights: {
        Row: {
          content: string
          created_at: string
          credit_analysis_id: string
          id: string
          insight_type: string
          metadata: Json | null
          section: string | null
          tenant_id: string
        }
        Insert: {
          content: string
          created_at?: string
          credit_analysis_id: string
          id?: string
          insight_type: string
          metadata?: Json | null
          section?: string | null
          tenant_id?: string
        }
        Update: {
          content?: string
          created_at?: string
          credit_analysis_id?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          section?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_insights_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_analysis_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_analysis_sacados: {
        Row: {
          credit_analysis_id: string
          id: string
          percentual_faturamento: number | null
          prazo_medio: number | null
          sacado_nome: string
          tenant_id: string
        }
        Insert: {
          credit_analysis_id: string
          id?: string
          percentual_faturamento?: number | null
          prazo_medio?: number | null
          sacado_nome: string
          tenant_id?: string
        }
        Update: {
          credit_analysis_id?: string
          id?: string
          percentual_faturamento?: number | null
          prazo_medio?: number | null
          sacado_nome?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_sacados_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_analysis_sacados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_analysis_socios: {
        Row: {
          cargo: string | null
          cpf: string | null
          credit_analysis_id: string
          id: string
          nome: string
          participacao: number | null
          tenant_id: string
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          credit_analysis_id: string
          id?: string
          nome: string
          participacao?: number | null
          tenant_id?: string
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          credit_analysis_id?: string
          id?: string
          nome?: string
          participacao?: number | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_socios_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_analysis_socios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_committee: {
        Row: {
          created_at: string
          credit_analysis_id: string
          id: string
          member_name: string
          member_role: string | null
          observation: string | null
          tenant_id: string
          vote: Database["public"]["Enums"]["committee_vote"]
          vote_date: string
        }
        Insert: {
          created_at?: string
          credit_analysis_id: string
          id?: string
          member_name: string
          member_role?: string | null
          observation?: string | null
          tenant_id?: string
          vote: Database["public"]["Enums"]["committee_vote"]
          vote_date?: string
        }
        Update: {
          created_at?: string
          credit_analysis_id?: string
          id?: string
          member_name?: string
          member_role?: string | null
          observation?: string | null
          tenant_id?: string
          vote?: Database["public"]["Enums"]["committee_vote"]
          vote_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_committee_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_committee_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_engine_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          parameters: Json
          priority: number
          rule_name: string
          rule_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameters?: Json
          priority?: number
          rule_name: string
          rule_type: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameters?: Json
          priority?: number
          rule_name?: string
          rule_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_engine_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          is_lost: boolean
          is_won: boolean
          name: string
          order: number
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
          order?: number
          tenant_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
          order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          client_id: string
          contact_id: string | null
          created_at: string
          credit_analysis_id: string | null
          expected_close_date: string | null
          id: string
          loss_reason: string | null
          notes: string | null
          probability: number | null
          responsible: string | null
          stage_id: string
          tenant_id: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          client_id: string
          contact_id?: string | null
          created_at?: string
          credit_analysis_id?: string | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          probability?: number | null
          responsible?: string | null
          stage_id: string
          tenant_id?: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          client_id?: string
          contact_id?: string | null
          created_at?: string
          credit_analysis_id?: string | null
          expected_close_date?: string | null
          id?: string
          loss_reason?: string | null
          notes?: string | null
          probability?: number | null
          responsible?: string | null
          stage_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_configs: {
        Row: {
          api_url: string | null
          auth_secret_name: string | null
          auth_type: string | null
          created_at: string
          field_mapping: Json | null
          id: string
          integration_type: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          api_url?: string | null
          auth_secret_name?: string | null
          auth_type?: string | null
          created_at?: string
          field_mapping?: Json | null
          id?: string
          integration_type: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          api_url?: string | null
          auth_secret_name?: string | null
          auth_type?: string | null
          created_at?: string
          field_mapping?: Json | null
          id?: string
          integration_type?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_invoices: {
        Row: {
          chave_acesso: string | null
          client_id: string
          created_at: string
          data_emissao: string | null
          destinatario_cnpj: string | null
          destinatario_nome: string | null
          id: string
          natureza_operacao: string | null
          numero_nf: string | null
          serie: string | null
          source: string
          tenant_id: string
          updated_at: string
          validation_message: string | null
          validation_status: string
          valor: number | null
          xml_data: Json | null
        }
        Insert: {
          chave_acesso?: string | null
          client_id: string
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          id?: string
          natureza_operacao?: string | null
          numero_nf?: string | null
          serie?: string | null
          source?: string
          tenant_id?: string
          updated_at?: string
          validation_message?: string | null
          validation_status?: string
          valor?: number | null
          xml_data?: Json | null
        }
        Update: {
          chave_acesso?: string | null
          client_id?: string
          created_at?: string
          data_emissao?: string | null
          destinatario_cnpj?: string | null
          destinatario_nome?: string | null
          id?: string
          natureza_operacao?: string | null
          numero_nf?: string | null
          serie?: string | null
          source?: string
          tenant_id?: string
          updated_at?: string
          validation_message?: string | null
          validation_status?: string
          valor?: number | null
          xml_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "monitored_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitored_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_group_clients: {
        Row: {
          client_id: string
          created_at: string
          group_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          group_id: string
          id?: string
          tenant_id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          group_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_group_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_group_clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "monitoring_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_group_clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_groups: {
        Row: {
          alerta_email: boolean
          alerta_sistema: boolean
          concentracao_maxima: number | null
          created_at: string
          description: string | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          limiar_atraso_dias: number | null
          limiar_variacao: number | null
          name: string
          next_run_at: string | null
          tenant_id: string
          updated_at: string
          volume_minimo: number | null
        }
        Insert: {
          alerta_email?: boolean
          alerta_sistema?: boolean
          concentracao_maxima?: number | null
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          limiar_atraso_dias?: number | null
          limiar_variacao?: number | null
          name: string
          next_run_at?: string | null
          tenant_id?: string
          updated_at?: string
          volume_minimo?: number | null
        }
        Update: {
          alerta_email?: boolean
          alerta_sistema?: boolean
          concentracao_maxima?: number | null
          created_at?: string
          description?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          limiar_atraso_dias?: number | null
          limiar_variacao?: number | null
          name?: string
          next_run_at?: string | null
          tenant_id?: string
          updated_at?: string
          volume_minimo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimonial_info: {
        Row: {
          client_id: string
          created_at: string
          descricao: string
          documento_proprietario: string | null
          id: string
          localizacao: string | null
          matricula_registro: string | null
          observacoes: string | null
          proprietario: string | null
          tenant_id: string
          tipo: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          descricao: string
          documento_proprietario?: string | null
          id?: string
          localizacao?: string | null
          matricula_registro?: string | null
          observacoes?: string | null
          proprietario?: string | null
          tenant_id?: string
          tipo: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          descricao?: string
          documento_proprietario?: string | null
          id?: string
          localizacao?: string | null
          matricula_registro?: string | null
          observacoes?: string | null
          proprietario?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "patrimonial_info_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patrimonial_info_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          full_name: string | null
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          client_id: string | null
          created_at: string
          documento: string
          expires_at: string | null
          id: string
          nome: string | null
          qualification_data: Json | null
          qualification_score: number | null
          qualification_status: string
          risk_level: string | null
          source: string | null
          tenant_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          documento: string
          expires_at?: string | null
          id?: string
          nome?: string | null
          qualification_data?: Json | null
          qualification_score?: number | null
          qualification_status?: string
          risk_level?: string | null
          source?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          documento?: string
          expires_at?: string | null
          id?: string
          nome?: string | null
          qualification_data?: Json | null
          qualification_score?: number | null
          qualification_status?: string
          risk_level?: string | null
          source?: string | null
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          tenant_id: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          tenant_id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          tenant_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          id: string
          nome: string
          plano: Database["public"]["Enums"]["tenant_plan"]
          tipo: Database["public"]["Enums"]["tenant_type"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
          plano?: Database["public"]["Enums"]["tenant_plan"]
          tipo?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
          plano?: Database["public"]["Enums"]["tenant_plan"]
          tipo?: Database["public"]["Enums"]["tenant_type"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "analista" | "comite" | "leitor"
      bureau_consulta_status: "sucesso" | "erro" | "timeout" | "sem_dados"
      bureau_provider_type:
        | "serasa"
        | "boavista"
        | "spc"
        | "quod"
        | "assertiva"
        | "bigdatacorp"
        | "mock"
      committee_vote: "approve" | "restrict" | "reject"
      credit_recommendation: "approve" | "restrict" | "reject"
      credit_status:
        | "draft"
        | "in_committee"
        | "approved"
        | "approved_restricted"
        | "rejected"
      tenant_plan: "essencial" | "profissional" | "avancado" | "trial"
      tenant_type: "fidc" | "securitizadora" | "factoring" | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "analista", "comite", "leitor"],
      bureau_consulta_status: ["sucesso", "erro", "timeout", "sem_dados"],
      bureau_provider_type: [
        "serasa",
        "boavista",
        "spc",
        "quod",
        "assertiva",
        "bigdatacorp",
        "mock",
      ],
      committee_vote: ["approve", "restrict", "reject"],
      credit_recommendation: ["approve", "restrict", "reject"],
      credit_status: [
        "draft",
        "in_committee",
        "approved",
        "approved_restricted",
        "rejected",
      ],
      tenant_plan: ["essencial", "profissional", "avancado", "trial"],
      tenant_type: ["fidc", "securitizadora", "factoring", "outro"],
    },
  },
} as const
