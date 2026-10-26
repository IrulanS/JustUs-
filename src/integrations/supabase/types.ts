export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      bucket_items: {
        Row: {
          completed: boolean
          content: string
          created_at: string
          id: string
          list_id: string
          who: string
        }
        Insert: {
          completed?: boolean
          content: string
          created_at?: string
          id?: string
          list_id: string
          who: string
        }
        Update: {
          completed?: boolean
          content?: string
          created_at?: string
          id?: string
          list_id?: string
          who?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "bucket_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      bucket_lists: {
        Row: {
          created_at: string
          id: string
          title: string
          who: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          who: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          who?: string
        }
        Relationships: []
      }
      hearts: {
        Row: {
          created_at: string
          id: string
          who: string
        }
        Insert: {
          created_at?: string
          id?: string
          who: string
        }
        Update: {
          created_at?: string
          id?: string
          who?: string
        }
        Relationships: []
      }
      moods: {
        Row: {
          created_at: string
          emoji: string
          id: string
          label: string | null
          who: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          label?: string | null
          who: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          label?: string | null
          who?: string
        }
        Relationships: []
      }
      note_docs: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          who: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          who: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          who?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: string
          created_at: string
          id: string
          who: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          who: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          who?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          content: string
          created_at: string
          id: string
          who: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          who: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          who?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          drawn_question_id: string | null
          id: number
          last_meet: string
          next_meet: string
        }
        Insert: {
          drawn_question_id?: string | null
          id?: number
          last_meet?: string
          next_meet?: string
        }
        Update: {
          drawn_question_id?: string | null
          id?: number
          last_meet?: string
          next_meet?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_drawn_question_id_fkey"
            columns: ["drawn_question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      draw_shared_question: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
