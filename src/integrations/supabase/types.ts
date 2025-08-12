export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      ai_cost_analytics: {
        Row: {
          completion_cost: number
          completion_tokens: number
          context_size: number | null
          created_at: string | null
          feature_type: string
          id: string
          model_name: string
          model_pricing: Json | null
          prompt_cost: number
          prompt_tokens: number
          query_type: string | null
          request_id: string | null
          response_time_ms: number | null
          total_cost: number
          total_tokens: number
          user_id: string | null
          user_tier: string | null
        }
        Insert: {
          completion_cost: number
          completion_tokens: number
          context_size?: number | null
          created_at?: string | null
          feature_type: string
          id?: string
          model_name?: string
          model_pricing?: Json | null
          prompt_cost: number
          prompt_tokens: number
          query_type?: string | null
          request_id?: string | null
          response_time_ms?: number | null
          total_cost: number
          total_tokens: number
          user_id?: string | null
          user_tier?: string | null
        }
        Update: {
          completion_cost?: number
          completion_tokens?: number
          context_size?: number | null
          created_at?: string | null
          feature_type?: string
          id?: string
          model_name?: string
          model_pricing?: Json | null
          prompt_cost?: number
          prompt_tokens?: number
          query_type?: string | null
          request_id?: string | null
          response_time_ms?: number | null
          total_cost?: number
          total_tokens?: number
          user_id?: string | null
          user_tier?: string | null
        }
        Relationships: []
      }
      asset_aggregate_scores: {
        Row: {
          aggregate_score: number
          analysis_date: string
          asset_slug: string
          created_at: string
          id: number
          metric_count: number
          metric_scores: Json
          normalized_score: number
          previous_score: number | null
          score_change: number
        }
        Insert: {
          aggregate_score: number
          analysis_date: string
          asset_slug: string
          created_at?: string
          id?: number
          metric_count: number
          metric_scores: Json
          normalized_score: number
          previous_score?: number | null
          score_change?: number
        }
        Update: {
          aggregate_score?: number
          analysis_date?: string
          asset_slug?: string
          created_at?: string
          id?: number
          metric_count?: number
          metric_scores?: Json
          normalized_score?: number
          previous_score?: number | null
          score_change?: number
        }
        Relationships: []
      }
      asset_metrics: {
        Row: {
          asset_slug: string
          created_at: string | null
          currency: string | null
          datetime: string
          divergence_value: number | null
          id: string
          json_data: Json | null
          metric_category: string
          metric_type: string
          ohlc_close: number | null
          ohlc_high: number | null
          ohlc_low: number | null
          ohlc_open: number | null
          rank: number | null
          score: number | null
          supply_value: number | null
          trending_words: Json | null
          updated_at: string
          value: number | null
        }
        Insert: {
          asset_slug: string
          created_at?: string | null
          currency?: string | null
          datetime: string
          divergence_value?: number | null
          id?: string
          json_data?: Json | null
          metric_category?: string
          metric_type?: string
          ohlc_close?: number | null
          ohlc_high?: number | null
          ohlc_low?: number | null
          ohlc_open?: number | null
          rank?: number | null
          score?: number | null
          supply_value?: number | null
          trending_words?: Json | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          asset_slug?: string
          created_at?: string | null
          currency?: string | null
          datetime?: string
          divergence_value?: number | null
          id?: string
          json_data?: Json | null
          metric_category?: string
          metric_type?: string
          ohlc_close?: number | null
          ohlc_high?: number | null
          ohlc_low?: number | null
          ohlc_open?: number | null
          rank?: number | null
          score?: number | null
          supply_value?: number | null
          trending_words?: Json | null
          updated_at?: string
          value?: number | null
        }
        Relationships: []
      }
      asset_subscriptions: {
        Row: {
          asset_icon: string
          asset_id: string
          asset_name: string
          asset_slug: string
          asset_symbol: string
          created_at: string
          id: string
          last_report_sent: string | null
          report_days: string
          report_times: string[]
          user_id: string
        }
        Insert: {
          asset_icon: string
          asset_id?: string
          asset_name: string
          asset_slug: string
          asset_symbol: string
          created_at?: string
          id?: string
          last_report_sent?: string | null
          report_days?: string
          report_times: string[]
          user_id: string
        }
        Update: {
          asset_icon?: string
          asset_id?: string
          asset_name?: string
          asset_slug?: string
          asset_symbol?: string
          created_at?: string
          id?: string
          last_report_sent?: string | null
          report_days?: string
          report_times?: string[]
          user_id?: string
        }
        Relationships: []
      }
      asset_trending_words: {
        Row: {
          asset_slug: string
          context: Json | null
          created_at: string | null
          datetime: string
          id: string
          rank: number
          score: number
          word: string
        }
        Insert: {
          asset_slug: string
          context?: Json | null
          created_at?: string | null
          datetime: string
          id: string
          rank: number
          score: number
          word: string
        }
        Update: {
          asset_slug?: string
          context?: Json | null
          created_at?: string | null
          datetime?: string
          id?: string
          rank?: number
          score?: number
          word?: string
        }
        Relationships: []
      }
      metric_sync_status: {
        Row: {
          asset_slug: string
          created_at: string
          error_message: string | null
          last_sync: string
          sync_status: string
          updated_at: string
        }
        Insert: {
          asset_slug: string
          created_at?: string
          error_message?: string | null
          last_sync: string
          sync_status?: string
          updated_at?: string
        }
        Update: {
          asset_slug?: string
          created_at?: string
          error_message?: string | null
          last_sync?: string
          sync_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      migration_log: {
        Row: {
          description: string | null
          executed_at: string | null
          id: number
          rollback_sql: string | null
          version: string
        }
        Insert: {
          description?: string | null
          executed_at?: string | null
          id?: number
          rollback_sql?: string | null
          version: string
        }
        Update: {
          description?: string | null
          executed_at?: string | null
          id?: number
          rollback_sql?: string | null
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          additional_assets: number | null
          created_at: string
          daily_chat_requests: number | null
          email: string
          features: Json | null
          first_name: string
          global_report_time: string | null
          id: string
          is_admin: boolean | null
          is_trial_user: boolean | null
          last_chat_date: string | null
          last_monthly_reset_date: string | null
          last_name: string
          monthly_chat_requests: number | null
          purchased_requests: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier_id: string | null
          texture_preference: boolean | null
          trial_end_date: string | null
          trial_start_date: string | null
          trial_started_at: string | null
          welcome_report_sent: boolean | null
        }
        Insert: {
          additional_assets?: number | null
          created_at?: string
          daily_chat_requests?: number | null
          email: string
          features?: Json | null
          first_name: string
          global_report_time?: string | null
          id: string
          is_admin?: boolean | null
          is_trial_user?: boolean | null
          last_chat_date?: string | null
          last_monthly_reset_date?: string | null
          last_name: string
          monthly_chat_requests?: number | null
          purchased_requests?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier_id?: string | null
          texture_preference?: boolean | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_started_at?: string | null
          welcome_report_sent?: boolean | null
        }
        Update: {
          additional_assets?: number | null
          created_at?: string
          daily_chat_requests?: number | null
          email?: string
          features?: Json | null
          first_name?: string
          global_report_time?: string | null
          id?: string
          is_admin?: boolean | null
          is_trial_user?: boolean | null
          last_chat_date?: string | null
          last_monthly_reset_date?: string | null
          last_name?: string
          monthly_chat_requests?: number | null
          purchased_requests?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier_id?: string | null
          texture_preference?: boolean | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_started_at?: string | null
          welcome_report_sent?: boolean | null
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
      profiles_backup_20250805: {
        Row: {
          additional_assets: number | null
          created_at: string | null
          email: string | null
          first_name: string | null
          global_report_time: string | null
          id: string | null
          is_admin: boolean | null
          is_trial_user: boolean | null
          last_name: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_tier_id: string | null
          texture_preference: boolean | null
          trial_end_date: string | null
          trial_start_date: string | null
          trial_started_at: string | null
        }
        Insert: {
          additional_assets?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          global_report_time?: string | null
          id?: string | null
          is_admin?: boolean | null
          is_trial_user?: boolean | null
          last_name?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier_id?: string | null
          texture_preference?: boolean | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_started_at?: string | null
        }
        Update: {
          additional_assets?: number | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          global_report_time?: string | null
          id?: string | null
          is_admin?: boolean | null
          is_trial_user?: boolean | null
          last_name?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_tier_id?: string | null
          texture_preference?: boolean | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          trial_started_at?: string | null
        }
        Relationships: []
      }
      report_log: {
        Row: {
          asset_name: string
          asset_slug: string
          asset_symbol: string
          email_count: number
          email_list: string[]
          id: string
          report_time: string
          response: string | null
          success: boolean | null
          triggered_at: string | null
        }
        Insert: {
          asset_name: string
          asset_slug: string
          asset_symbol: string
          email_count: number
          email_list: string[]
          id?: string
          report_time: string
          response?: string | null
          success?: boolean | null
          triggered_at?: string | null
        }
        Update: {
          asset_name?: string
          asset_slug?: string
          asset_symbol?: string
          email_count?: number
          email_list?: string[]
          id?: string
          report_time?: string
          response?: string | null
          success?: boolean | null
          triggered_at?: string | null
        }
        Relationships: []
      }
      request_purchases: {
        Row: {
          amount_paid: number
          created_at: string | null
          currency: string | null
          id: string
          requests_purchased: number
          status: string
          stripe_payment_intent_id: string
          user_id: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          currency?: string | null
          id?: string
          requests_purchased: number
          status?: string
          stripe_payment_intent_id: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          requests_purchased?: number
          status?: string
          stripe_payment_intent_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      test_insert_debug: {
        Row: {
          created_at: string | null
          id: number
          test_data: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          test_data: string
        }
        Update: {
          created_at?: string | null
          id?: number
          test_data?: string
        }
        Relationships: []
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
          stripe_price_id_annual: string | null
          stripe_price_id_monthly: string | null
          stripe_price_id_weekly: string | null
          updated_at: string | null
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
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_weekly?: string | null
          updated_at?: string | null
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
          stripe_price_id_annual?: string | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_weekly?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      trigger_logs: {
        Row: {
          asset_slug: string | null
          details: Json | null
          event_time: string | null
          id: number
          response: string | null
        }
        Insert: {
          asset_slug?: string | null
          details?: Json | null
          event_time?: string | null
          id?: number
          response?: string | null
        }
        Update: {
          asset_slug?: string | null
          details?: Json | null
          event_time?: string | null
          id?: number
          response?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      cost_by_tier_summary: {
        Row: {
          avg_cost_per_request: number | null
          feature_type: string | null
          total_cost: number | null
          total_requests: number | null
          total_tokens: number | null
          unique_users: number | null
          user_tier: string | null
        }
        Relationships: []
      }
      monthly_ai_cost_summary: {
        Row: {
          avg_cost_per_request: number | null
          avg_response_time_ms: number | null
          feature_type: string | null
          month: string | null
          total_cost_usd: number | null
          total_requests: number | null
          total_tokens_used: number | null
        }
        Relationships: []
      }
      trial_users_summary: {
        Row: {
          expired_trials: number | null
          total_trial_users: number | null
          trials_started_24h: number | null
          trials_started_7d: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      clean_old_metrics_data: {
        Args: { days_to_keep: number }
        Returns: number
      }
      debug_current_time: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_full_time: string
          current_time_string: string
          database_timezone: string
          users_scheduled_now: number
          scheduled_users_info: Json
        }[]
      }
      debug_user_matching: {
        Args: Record<PropertyKey, never>
        Returns: {
          debug_info: string
        }[]
      }
      disable_feature: {
        Args: { user_id: string; feature_name: string }
        Returns: undefined
      }
      enable_feature: {
        Args: { user_id: string; feature_name: string }
        Returns: undefined
      }
      enable_feature_for_tier: {
        Args: { tier_name: string; feature_name: string }
        Returns: number
      }
      get_daily_chat_limit: {
        Args: { user_id: string }
        Returns: Json
      }
      get_feature_stats: {
        Args: { feature_name: string }
        Returns: Json
      }
      get_next_reset_date: {
        Args: { user_id: string }
        Returns: string
      }
      get_user_billing_day: {
        Args: { user_id: string }
        Returns: number
      }
      get_users_with_feature: {
        Args: { feature_name: string }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          tier_name: string
        }[]
      }
      has_feature: {
        Args: { user_id: string; feature_name: string }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      increment_daily_requests: {
        Args: { user_id: string }
        Returns: undefined
      }
      increment_monthly_requests: {
        Args: { user_id: string }
        Returns: undefined
      }
      needs_monthly_reset: {
        Args: { user_id: string }
        Returns: boolean
      }
      process_scheduled_reports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_scheduled_reports_debug: {
        Args: Record<PropertyKey, never>
        Returns: {
          debug_info: string
        }[]
      }
      reset_daily_chat_requests: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      run_due_asset_reports: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      save_aggregate_score: {
        Args: {
          p_asset_slug: string
          p_price_change: number
          p_score: number
          p_metric_scores?: Json
          p_metric_count?: number
        }
        Returns: Json
      }
      test_daily_chat_system: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_feature_flag_system: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_http_fields: {
        Args: Record<PropertyKey, never>
        Returns: {
          response_info: string
        }[]
      }
      test_http_response: {
        Args: Record<PropertyKey, never>
        Returns: {
          response_info: string
        }[]
      }
      test_http_response_detailed: {
        Args: Record<PropertyKey, never>
        Returns: {
          response_info: string
        }[]
      }
      test_queue_fields: {
        Args: Record<PropertyKey, never>
        Returns: {
          response_info: string
        }[]
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      update_user_trial_subscription: {
        Args: {
          user_id: string
          trial_tier_id: string
          trial_start_date: string
          trial_end_date: string
        }
        Returns: undefined
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      currency_type: "USD" | "BTC" | "USDT"
      metric_category:
        | "price"
        | "market"
        | "trading"
        | "network"
        | "social"
        | "ethereum"
        | "dex"
      metric_type:
        | "price"
        | "marketcap"
        | "trading_volume"
        | "fully_diluted_valuation"
        | "ohlc"
        | "price_volatility"
        | "annual_inflation_rate"
        | "rsi"
        | "gini_index"
        | "eth_fees"
        | "eth_spent"
        | "mean_coin_age"
        | "transaction_cost"
        | "dex_metrics"
        | "btc_sp500_divergence"
        | "m2_money_supply"
        | "community_messages"
        | "emerging_trends"
        | "sentiment"
        | "social_dominance"
        | "social_volume"
        | "unique_social_volume"
        | "trending_words_rank"
        | "nft_social_volume"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      currency_type: ["USD", "BTC", "USDT"],
      metric_category: [
        "price",
        "market",
        "trading",
        "network",
        "social",
        "ethereum",
        "dex",
      ],
      metric_type: [
        "price",
        "marketcap",
        "trading_volume",
        "fully_diluted_valuation",
        "ohlc",
        "price_volatility",
        "annual_inflation_rate",
        "rsi",
        "gini_index",
        "eth_fees",
        "eth_spent",
        "mean_coin_age",
        "transaction_cost",
        "dex_metrics",
        "btc_sp500_divergence",
        "m2_money_supply",
        "community_messages",
        "emerging_trends",
        "sentiment",
        "social_dominance",
        "social_volume",
        "unique_social_volume",
        "trending_words_rank",
        "nft_social_volume",
      ],
    },
  },
} as const
