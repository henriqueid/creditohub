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
      credit_analysis: {
        Row: {
          acoes_judiciais: string | null
          analise_faturamento: string | null
          analista_credito: string | null
          cheques_sem_fundo: string | null
          client_id: string
          concentracao_maxima: number | null
          created_at: string
          credit_score: number | null
          data_analise: string | null
          dependencia_clientes: string | null
          endividamento: string | null
          estrutura_financeira: string | null
          faturamento_medio: number | null
          garantias: string | null
          historico_socios: string | null
          id: string
          limite_sugerido: number | null
          observacoes_credito: string | null
          parecer_analista: string | null
          pendencias: string | null
          pontos_positivos: string | null
          prazo_medio_permitido: number | null
          prazo_medio_titulos: number | null
          protestos: string | null
          recommendation:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          responsavel_comercial: string | null
          riscos: string | null
          status: Database["public"]["Enums"]["credit_status"]
          updated_at: string
          volume_estimado: number | null
        }
        Insert: {
          acoes_judiciais?: string | null
          analise_faturamento?: string | null
          analista_credito?: string | null
          cheques_sem_fundo?: string | null
          client_id: string
          concentracao_maxima?: number | null
          created_at?: string
          credit_score?: number | null
          data_analise?: string | null
          dependencia_clientes?: string | null
          endividamento?: string | null
          estrutura_financeira?: string | null
          faturamento_medio?: number | null
          garantias?: string | null
          historico_socios?: string | null
          id?: string
          limite_sugerido?: number | null
          observacoes_credito?: string | null
          parecer_analista?: string | null
          pendencias?: string | null
          pontos_positivos?: string | null
          prazo_medio_permitido?: number | null
          prazo_medio_titulos?: number | null
          protestos?: string | null
          recommendation?:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          responsavel_comercial?: string | null
          riscos?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
          updated_at?: string
          volume_estimado?: number | null
        }
        Update: {
          acoes_judiciais?: string | null
          analise_faturamento?: string | null
          analista_credito?: string | null
          cheques_sem_fundo?: string | null
          client_id?: string
          concentracao_maxima?: number | null
          created_at?: string
          credit_score?: number | null
          data_analise?: string | null
          dependencia_clientes?: string | null
          endividamento?: string | null
          estrutura_financeira?: string | null
          faturamento_medio?: number | null
          garantias?: string | null
          historico_socios?: string | null
          id?: string
          limite_sugerido?: number | null
          observacoes_credito?: string | null
          parecer_analista?: string | null
          pendencias?: string | null
          pontos_positivos?: string | null
          prazo_medio_permitido?: number | null
          prazo_medio_titulos?: number | null
          protestos?: string | null
          recommendation?:
            | Database["public"]["Enums"]["credit_recommendation"]
            | null
          responsavel_comercial?: string | null
          riscos?: string | null
          status?: Database["public"]["Enums"]["credit_status"]
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
