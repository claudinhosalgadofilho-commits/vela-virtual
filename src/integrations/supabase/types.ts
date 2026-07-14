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
      admin_settings: {
        Row: {
          id: number
          mp_access_token: string | null
          mp_public_key: string | null
          mp_webhook_secret: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          mp_access_token?: string | null
          mp_public_key?: string | null
          mp_webhook_secret?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      candles: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          display_order: number
          duration_hours: number
          id: string
          image_url: string | null
          name: string
          price_cents: number
          slug: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          duration_hours?: number
          id?: string
          image_url?: string | null
          name: string
          price_cents: number
          slug: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          duration_hours?: number
          id?: string
          image_url?: string | null
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_cents: number
          candle_id: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          external_payment_id: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          payment_method: string
          pix_qr_base64: string | null
          pix_qr_code: string | null
          status: Database["public"]["Enums"]["order_status"]
          tribute_message: string | null
          tribute_name: string
          tribute_photo_url: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          candle_id: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          external_payment_id?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          payment_method?: string
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tribute_message?: string | null
          tribute_name: string
          tribute_photo_url?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          candle_id?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          external_payment_id?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          payment_method?: string
          pix_qr_base64?: string | null
          pix_qr_code?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          tribute_message?: string | null
          tribute_name?: string
          tribute_photo_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_candle_id_fkey"
            columns: ["candle_id"]
            isOneToOne: false
            referencedRelation: "candles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          company_name: string
          email: string | null
          facebook: string | null
          favicon_url: string | null
          google_analytics_id: string | null
          id: number
          instagram: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          phone: string | null
          seo_description: string | null
          seo_title: string | null
          updated_at: string
          whatsapp: string | null
          youtube: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          id?: number
          instagram?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          phone?: string | null
          seo_description?: string | null
          seo_title?: string | null
          updated_at?: string
          whatsapp?: string | null
          youtube?: string | null
        }
        Relationships: []
      }
      tributes: {
        Row: {
          active: boolean
          candle_id: string
          created_at: string
          ends_at: string
          id: string
          order_id: string | null
          starts_at: string
          tribute_message: string | null
          tribute_name: string
          tribute_photo_url: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          active?: boolean
          candle_id: string
          created_at?: string
          ends_at: string
          id?: string
          order_id?: string | null
          starts_at?: string
          tribute_message?: string | null
          tribute_name: string
          tribute_photo_url?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          active?: boolean
          candle_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          order_id?: string | null
          starts_at?: string
          tribute_message?: string | null
          tribute_name?: string
          tribute_photo_url?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tributes_candle_id_fkey"
            columns: ["candle_id"]
            isOneToOne: false
            referencedRelation: "candles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tributes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "paid" | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: ["pending", "paid", "cancelled"],
    },
  },
} as const
