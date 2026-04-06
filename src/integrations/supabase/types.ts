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
        }
        Relationships: []
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
        ]
      }
      blacklist: {
        Row: {
          adicionado_por: string | null
          created_at: string
          documento: string
          id: string
          motivo: string | null
          tipo: string
        }
        Insert: {
          adicionado_por?: string | null
          created_at?: string
          documento: string
          id?: string
          motivo?: string | null
          tipo: string
        }
        Update: {
          adicionado_por?: string | null
          created_at?: string
          documento?: string
          id?: string
          motivo?: string | null
          tipo?: string
        }
        Relationships: []
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tag_id?: string
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
        }
        Relationships: []
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
        }
        Relationships: [
          {
            foreignKeyName: "committee_result_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: true
            referencedRelation: "credit_analysis"
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
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_attachments_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
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
        }
        Insert: {
          content: string
          created_at?: string
          credit_analysis_id: string
          id?: string
          insight_type: string
          metadata?: Json | null
          section?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          credit_analysis_id?: string
          id?: string
          insight_type?: string
          metadata?: Json | null
          section?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_insights_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
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
        }
        Insert: {
          credit_analysis_id: string
          id?: string
          percentual_faturamento?: number | null
          prazo_medio?: number | null
          sacado_nome: string
        }
        Update: {
          credit_analysis_id?: string
          id?: string
          percentual_faturamento?: number | null
          prazo_medio?: number | null
          sacado_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_sacados_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
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
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          credit_analysis_id: string
          id?: string
          nome: string
          participacao?: number | null
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          credit_analysis_id?: string
          id?: string
          nome?: string
          participacao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_analysis_socios_credit_analysis_id_fkey"
            columns: ["credit_analysis_id"]
            isOneToOne: false
            referencedRelation: "credit_analysis"
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
          updated_at?: string
        }
        Relationships: []
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
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      monitoring_group_clients: {
        Row: {
          client_id: string
          created_at: string
          group_id: string
          id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          group_id: string
          id?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          group_id?: string
          id?: string
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
          limiar_atraso_dias: number | null
          limiar_variacao: number | null
          name: string
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
          limiar_atraso_dias?: number | null
          limiar_variacao?: number | null
          name: string
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
          limiar_atraso_dias?: number | null
          limiar_variacao?: number | null
          name?: string
          updated_at?: string
          volume_minimo?: number | null
        }
        Relationships: []
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
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      system_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      committee_vote: "approve" | "restrict" | "reject"
      credit_recommendation: "approve" | "restrict" | "reject"
      credit_status:
        | "draft"
        | "in_committee"
        | "approved"
        | "approved_restricted"
        | "rejected"
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
      committee_vote: ["approve", "restrict", "reject"],
      credit_recommendation: ["approve", "restrict", "reject"],
      credit_status: [
        "draft",
        "in_committee",
        "approved",
        "approved_restricted",
        "rejected",
      ],
    },
  },
} as const
