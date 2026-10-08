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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          event_time: string
          id: string
          location: string
          name: string
          poster_url: string | null
          status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          created_at?: string
          description?: string
          event_date: string
          event_time?: string
          id?: string
          location?: string
          name: string
          poster_url?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          event_time?: string
          id?: string
          location?: string
          name?: string
          poster_url?: string | null
          status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: []
      }
      orders: {
        Row: {
          atletica: string | null
          created_at: string
          event_id: string
          id: string
          paid_at: string | null
          paid_by: string | null
          payment_reference: string | null
          promoter_id: string | null
          quantity: number
          receipt_path: string | null
          status: Database["public"]["Enums"]["order_status"]
          ticket_type_id: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          atletica?: string | null
          created_at?: string
          event_id: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          promoter_id?: string | null
          quantity: number
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          ticket_type_id: string
          total: number
          unit_price: number
          user_id: string
        }
        Update: {
          atletica?: string | null
          created_at?: string
          event_id?: string
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          payment_reference?: string | null
          promoter_id?: string | null
          quantity?: number
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          ticket_type_id?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "ticket_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          whatsapp?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          whatsapp?: string
        }
        Relationships: []
      }
      promoters: {
        Row: {
          atletica: string | null
          code: string
          created_at: string
          goal: number
          user_id: string
        }
        Insert: {
          atletica?: string | null
          code: string
          created_at?: string
          goal?: number
          user_id: string
        }
        Update: {
          atletica?: string | null
          code?: string
          created_at?: string
          goal?: number
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          atleticas: string[]
          color_1: string | null
          color_2: string | null
          color_3: string | null
          id: number
          logo_url: string | null
          payment_message: string
          receiver_name: string
          support_whatsapp: string
        }
        Insert: {
          atleticas?: string[]
          color_1?: string | null
          color_2?: string | null
          color_3?: string | null
          id?: number
          logo_url?: string | null
          payment_message?: string
          receiver_name?: string
          support_whatsapp?: string
        }
        Update: {
          atleticas?: string[]
          color_1?: string | null
          color_2?: string | null
          color_3?: string | null
          id?: number
          logo_url?: string | null
          payment_message?: string
          receiver_name?: string
          support_whatsapp?: string
        }
        Relationships: []
      }
      ticket_types: {
        Row: {
          active: boolean
          created_at: string
          event_id: string
          id: string
          name: string
          payment_link: string | null
          price: number
          sold: number
          total_quantity: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          event_id: string
          id?: string
          name: string
          payment_link?: string | null
          price?: number
          sold?: number
          total_quantity?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          event_id?: string
          id?: string
          name?: string
          payment_link?: string | null
          price?: number
          sold?: number
          total_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "ticket_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          checked_in_at: string | null
          code: string
          created_at: string
          event_id: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          code?: string
          created_at?: string
          event_id: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          code?: string
          created_at?: string
          event_id?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atletica_report: {
        Args: { _atletica?: string }
        Returns: {
          atletica: string
          checked_in: number
          created_at: string
          email: string
          event_name: string
          full_name: string
          promoter: string
          quantity: number
          status: string
          ticket_type: string
          whatsapp: string
        }[]
      }
      cancel_order: { Args: { _order_id: string }; Returns: undefined }
      check_in_ticket: { Args: { _code: string }; Returns: Json }
      create_order: {
        Args: { _quantity: number; _ticket_type_id: string }
        Returns: string
      }
      grant_admin: { Args: { _email: string }; Returns: undefined }
      grant_role: {
        Args: { _email: string; _role: string }
        Returns: undefined
      }
      guest_list: {
        Args: { _event_id: string }
        Returns: {
          atletica: string
          checked_in_at: string
          code: string
          email: string
          full_name: string
          ticket_type: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_text: { Args: { _role: string; _uid: string }; Returns: boolean }
      is_staff: { Args: { _uid: string }; Returns: boolean }
      list_staff: {
        Args: never
        Returns: {
          email: string
          full_name: string
          role: string
          user_id: string
        }[]
      }
      mark_order_paid: { Args: { _order_id: string }; Returns: undefined }
      promoter_info: {
        Args: never
        Returns: {
          atletica: string
          code: string
          user_id: string
        }[]
      }
      promoter_stats: {
        Args: { _user_id?: string }
        Returns: {
          code: string
          full_name: string
          goal: number
          pending: number
          revenue: number
          sold: number
          user_id: string
        }[]
      }
      revert_order_paid: { Args: { _order_id: string }; Returns: undefined }
      revoke_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      set_order_atletica: {
        Args: { _atletica: string; _order_id: string }
        Returns: undefined
      }
      set_order_promoter: {
        Args: { _code: string; _order_id: string }
        Returns: undefined
      }
      set_order_receipt: {
        Args: { _order_id: string; _path: string }
        Returns: undefined
      }
      staff_events: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "moderator" | "promoter"
      event_status: "ativo" | "inativo" | "arquivado"
      order_status: "aguardando_pagamento" | "pago" | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user", "moderator", "promoter"],
      event_status: ["ativo", "inativo", "arquivado"],
      order_status: ["aguardando_pagamento", "pago", "cancelado"],
    },
  },
} as const
