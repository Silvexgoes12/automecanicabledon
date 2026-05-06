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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cidade: string | null
          created_at: string
          documento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["tipo_cliente"]
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
        }
        Update: {
          cidade?: string | null
          created_at?: string
          documento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["tipo_cliente"]
        }
        Relationships: []
      }
      crm_interacoes: {
        Row: {
          assunto: string
          cliente_id: string | null
          created_at: string
          data: string
          descricao: string | null
          funcionario_id: string | null
          id: string
          lead_id: string | null
          tipo: Database["public"]["Enums"]["tipo_interacao"]
        }
        Insert: {
          assunto: string
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          lead_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_interacao"]
        }
        Update: {
          assunto?: string
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          funcionario_id?: string | null
          id?: string
          lead_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_interacao"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interacoes_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_criacao: string
          data_fechamento: string | null
          email: string | null
          empresa: string | null
          estagio: Database["public"]["Enums"]["estagio_funil"]
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          responsavel_id: string | null
          telefone: string | null
          valor_estimado: number | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_criacao?: string
          data_fechamento?: string | null
          email?: string | null
          empresa?: string | null
          estagio?: Database["public"]["Enums"]["estagio_funil"]
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_criacao?: string
          data_fechamento?: string | null
          email?: string | null
          empresa?: string | null
          estagio?: Database["public"]["Enums"]["estagio_funil"]
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas: {
        Row: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          created_at: string
          data: string
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          fornecedor_id: string | null
          funcionario_id: string | null
          id: string
          observacoes: string | null
          recorrente: boolean
          valor: number
        }
        Insert: {
          categoria: Database["public"]["Enums"]["categoria_despesa"]
          created_at?: string
          data: string
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          observacoes?: string | null
          recorrente?: boolean
          valor: number
        }
        Update: {
          categoria?: Database["public"]["Enums"]["categoria_despesa"]
          created_at?: string
          data?: string
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          observacoes?: string | null
          recorrente?: boolean
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "despesas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despesas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          categoria: string
          cidade: string | null
          cnpj: string | null
          contato: string | null
          created_at: string
          email: string | null
          estado: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          categoria: string
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          categoria?: string
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          ativo: boolean
          cargo: string
          cpf: string | null
          created_at: string
          data_admissao: string
          data_demissao: string | null
          id: string
          nome: string
          salario: number
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cargo: string
          cpf?: string | null
          created_at?: string
          data_admissao: string
          data_demissao?: string | null
          id?: string
          nome: string
          salario: number
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cargo?: string
          cpf?: string | null
          created_at?: string
          data_admissao?: string
          data_demissao?: string | null
          id?: string
          nome?: string
          salario?: number
          telefone?: string | null
        }
        Relationships: []
      }
      lancamentos: {
        Row: {
          categoria: string
          cliente_fornecedor: string | null
          conta: Database["public"]["Enums"]["lancamento_conta"]
          created_at: string
          data: string
          data_pagamento: string | null
          data_vencimento: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          os_id: string | null
          status: Database["public"]["Enums"]["lancamento_status"]
          subcategoria: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          valor: number
        }
        Insert: {
          categoria: string
          cliente_fornecedor?: string | null
          conta?: Database["public"]["Enums"]["lancamento_conta"]
          created_at?: string
          data: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          subcategoria?: string | null
          tipo: Database["public"]["Enums"]["lancamento_tipo"]
          valor: number
        }
        Update: {
          categoria?: string
          cliente_fornecedor?: string | null
          conta?: Database["public"]["Enums"]["lancamento_conta"]
          created_at?: string
          data?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          os_id?: string | null
          status?: Database["public"]["Enums"]["lancamento_status"]
          subcategoria?: string | null
          tipo?: Database["public"]["Enums"]["lancamento_tipo"]
          valor?: number
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          cliente_id: string
          created_at: string
          custo_pecas: number
          data_abertura: string
          data_conclusao: string | null
          data_entrega: string | null
          descricao_problema: string | null
          diagnostico: string | null
          id: string
          km_entrada: number | null
          mecanico_id: string | null
          numero: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_os"]
          valor_desconto: number
          valor_pecas: number
          valor_servicos: number
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          custo_pecas?: number
          data_abertura: string
          data_conclusao?: string | null
          data_entrega?: string | null
          descricao_problema?: string | null
          diagnostico?: string | null
          id?: string
          km_entrada?: number | null
          mecanico_id?: string | null
          numero: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_os"]
          valor_desconto?: number
          valor_pecas?: number
          valor_servicos?: number
          valor_total?: number
          veiculo_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          custo_pecas?: number
          data_abertura?: string
          data_conclusao?: string | null
          data_entrega?: string | null
          descricao_problema?: string | null
          diagnostico?: string | null
          id?: string
          km_entrada?: number | null
          mecanico_id?: string | null
          numero?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_os"]
          valor_desconto?: number
          valor_pecas?: number
          valor_servicos?: number
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_mecanico_id_fkey"
            columns: ["mecanico_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      os_itens: {
        Row: {
          created_at: string
          custo_unitario: number
          descricao: string
          id: string
          os_id: string
          peca_id: string | null
          preco_unitario: number
          quantidade: number
          servico_id: string | null
          subtotal: number
          tipo: string
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          descricao: string
          id?: string
          os_id: string
          peca_id?: string | null
          preco_unitario: number
          quantidade?: number
          servico_id?: string | null
          subtotal: number
          tipo: string
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          descricao?: string
          id?: string
          os_id?: string
          peca_id?: string | null
          preco_unitario?: number
          quantidade?: number
          servico_id?: string | null
          subtotal?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_itens_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_itens_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_itens_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          data: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          observacoes: string | null
          os_id: string
          parcelas: number
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacoes?: string | null
          os_id: string
          parcelas?: number
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          observacoes?: string | null
          os_id?: string
          parcelas?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          estoque_atual: number
          estoque_minimo: number
          fornecedor_id: string | null
          id: string
          nome: string
          preco_custo: number
          preco_venda: number
          unidade: string
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome: string
          preco_custo: number
          preco_venda: number
          unidade?: string
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          estoque_atual?: number
          estoque_minimo?: number
          fornecedor_id?: string | null
          id?: string
          nome?: string
          preco_custo?: number
          preco_venda?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "pecas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_catalogo: {
        Row: {
          categoria: string
          codigo: string
          created_at: string
          id: string
          nome: string
          preco_base: number
          tempo_estimado_horas: number | null
        }
        Insert: {
          categoria: string
          codigo: string
          created_at?: string
          id?: string
          nome: string
          preco_base: number
          tempo_estimado_horas?: number | null
        }
        Update: {
          categoria?: string
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          preco_base?: number
          tempo_estimado_horas?: number | null
        }
        Relationships: []
      }
      veiculos: {
        Row: {
          ano: number | null
          cliente_id: string | null
          cor: string | null
          created_at: string
          id: string
          km_atual: number | null
          marca: string
          modelo: string
          motor: string | null
          placa: string
          tipo: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Insert: {
          ano?: number | null
          cliente_id?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          km_atual?: number | null
          marca: string
          modelo: string
          motor?: string | null
          placa: string
          tipo?: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Update: {
          ano?: number | null
          cliente_id?: string | null
          cor?: string | null
          created_at?: string
          id?: string
          km_atual?: number | null
          marca?: string
          modelo?: string
          motor?: string | null
          placa?: string
          tipo?: Database["public"]["Enums"]["tipo_veiculo"]
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
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
      categoria_despesa:
        | "folha_pagamento"
        | "encargos_sociais"
        | "aluguel"
        | "energia"
        | "agua"
        | "internet"
        | "telefone"
        | "impostos"
        | "compra_pecas"
        | "compra_lubrificantes"
        | "ferramentas"
        | "epi"
        | "marketing"
        | "manutencao_predial"
        | "treinamento"
        | "contabilidade"
        | "seguros"
        | "combustivel_frota"
        | "material_escritorio"
        | "software"
        | "descarte_residuos"
        | "outros"
      estagio_funil:
        | "novo"
        | "contato_feito"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
      forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao_debito"
        | "cartao_credito"
        | "boleto"
        | "transferencia"
      lancamento_conta: "caixa" | "banco" | "cartao"
      lancamento_status: "previsto" | "realizado"
      lancamento_tipo: "entrada" | "saida"
      status_os:
        | "aberta"
        | "em_andamento"
        | "aguardando_peca"
        | "concluida"
        | "cancelada"
        | "entregue"
      tipo_cliente: "PF" | "PJ"
      tipo_interacao:
        | "ligacao"
        | "whatsapp"
        | "email"
        | "visita"
        | "reuniao"
        | "orcamento"
      tipo_veiculo:
        | "caminhao"
        | "onibus"
        | "van"
        | "picape"
        | "maquinario"
        | "trator"
        | "outro"
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
      categoria_despesa: [
        "folha_pagamento",
        "encargos_sociais",
        "aluguel",
        "energia",
        "agua",
        "internet",
        "telefone",
        "impostos",
        "compra_pecas",
        "compra_lubrificantes",
        "ferramentas",
        "epi",
        "marketing",
        "manutencao_predial",
        "treinamento",
        "contabilidade",
        "seguros",
        "combustivel_frota",
        "material_escritorio",
        "software",
        "descarte_residuos",
        "outros",
      ],
      estagio_funil: [
        "novo",
        "contato_feito",
        "qualificado",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
      forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao_debito",
        "cartao_credito",
        "boleto",
        "transferencia",
      ],
      lancamento_conta: ["caixa", "banco", "cartao"],
      lancamento_status: ["previsto", "realizado"],
      lancamento_tipo: ["entrada", "saida"],
      status_os: [
        "aberta",
        "em_andamento",
        "aguardando_peca",
        "concluida",
        "cancelada",
        "entregue",
      ],
      tipo_cliente: ["PF", "PJ"],
      tipo_interacao: [
        "ligacao",
        "whatsapp",
        "email",
        "visita",
        "reuniao",
        "orcamento",
      ],
      tipo_veiculo: [
        "caminhao",
        "onibus",
        "van",
        "picape",
        "maquinario",
        "trator",
        "outro",
      ],
    },
  },
} as const
