export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      asset_metrics: {
        Row: {
          asset_slug: string
          metric_type: string
          metric_category: string
          datetime: string
          value: string
          ohlc_open: string | null
          ohlc_high: string | null
          ohlc_low: string | null
          ohlc_close: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          asset_slug: string
          metric_type: string
          metric_category: string
          datetime: string
          value: string
          ohlc_open?: string | null
          ohlc_high?: string | null
          ohlc_low?: string | null
          ohlc_close?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          asset_slug?: string
          metric_type?: string
          metric_category?: string
          datetime?: string
          value?: string
          ohlc_open?: string | null
          ohlc_high?: string | null
          ohlc_low?: string | null
          ohlc_close?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_subscriptions: {
        Row: {
          asset_icon: string
          asset_slug: string
          asset_name: string
          asset_symbol: string
          created_at: string
          id: string
          last_report_sent: string | null
          report_days: string
          report_times: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_icon: string
          asset_slug: string
          asset_name: string
          asset_symbol: string
          created_at?: string
          id?: string
          last_report_sent?: string | null
          report_days?: string
          report_times: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_icon?: string
          asset_slug?: string
          asset_name?: string
          asset_symbol?: string
          created_at?: string
          id?: string
          last_report_sent?: string | null
          report_days?: string
          report_times?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          is_admin: boolean | null
          last_name: string
          subscription_tier_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          is_admin?: boolean | null
          last_name: string
          subscription_tier_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_admin?: boolean | null
          last_name?: string
          subscription_tier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_subscription_tier_id_fkey"
            columns: ["subscription_tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          additional_asset_price: number
          additional_report_price: number | null
          created_at: string
          id: string
          max_assets: number
          max_reports_per_day: number
          name: string
          price: number
          stripe_price_id_monthly: string | null
          updated_at: string
        }
        Insert: {
          additional_asset_price: number
          additional_report_price?: number | null
          created_at?: string
          id?: string
          max_assets: number
          max_reports_per_day: number
          name: string
          price: number
          stripe_price_id_monthly?: string | null
          updated_at?: string
        }
        Update: {
          additional_asset_price?: number
          additional_report_price?: number | null
          created_at?: string
          id?: string
          max_assets?: number
          max_reports_per_day?: number
          name?: string
          price?: number
          stripe_price_id_monthly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_user_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
  | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
    Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
    PublicSchema["Views"])
  ? (PublicSchema["Tables"] &
    PublicSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
  | keyof PublicSchema["Tables"]
  | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
  ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
  | keyof PublicSchema["Enums"]
  | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
  ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
  ? PublicSchema["Enums"][PublicEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof PublicSchema["CompositeTypes"]
  | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
  ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
  ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never
