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
      budget_alerts: {
        Row: {
          category: string
          created_at: string
          id: string
          limit_amount: number
          period: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          limit_amount: number
          period: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          limit_amount?: number
          period?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      historical_stock_data: {
        Row: {
          close: number
          high: number
          id: string
          low: number
          open: number
          symbol: string
          timestamp: string
          volume: number
        }
        Insert: {
          close: number
          high: number
          id?: string
          low: number
          open: number
          symbol: string
          timestamp: string
          volume: number
        }
        Update: {
          close?: number
          high?: number
          id?: string
          low?: number
          open?: number
          symbol?: string
          timestamp?: string
          volume?: number
        }
        Relationships: []
      }
      portfolio_holdings: {
        Row: {
          company_name: string
          created_at: string
          current_price: number | null
          id: string
          last_updated: string | null
          purchase_date: string
          purchase_price: number
          shares: number
          symbol: string
          user_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          current_price?: number | null
          id?: string
          last_updated?: string | null
          purchase_date?: string
          purchase_price: number
          shares: number
          symbol: string
          user_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          current_price?: number | null
          id?: string
          last_updated?: string | null
          purchase_date?: string
          purchase_price?: number
          shares?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_transactions: {
        Row: {
          created_at: string
          holding_id: string | null
          id: string
          price: number
          shares: number
          symbol: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          holding_id?: string | null
          id?: string
          price: number
          shares: number
          symbol: string
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          holding_id?: string | null
          id?: string
          price?: number
          shares?: number
          symbol?: string
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_transactions_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "portfolio_holdings"
            referencedColumns: ["id"]
          },
        ]
      }
      predicted_stock_prices: {
        Row: {
          id: string
          predicted_price: number
          symbol: string
          timestamp: string
        }
        Insert: {
          id?: string
          predicted_price: number
          symbol: string
          timestamp: string
        }
        Update: {
          id?: string
          predicted_price?: number
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      realtime_stock_prices: {
        Row: {
          id: string
          price: number
          symbol: string
          timestamp: string
        }
        Insert: {
          id?: string
          price: number
          symbol: string
          timestamp: string
        }
        Update: {
          id?: string
          price?: number
          symbol?: string
          timestamp?: string
        }
        Relationships: []
      }
      trading_conversations: {
        Row: {
          assistant_response: string
          id: string
          timestamp: string
          user_id: string
          user_message: string
        }
        Insert: {
          assistant_response: string
          id?: string
          timestamp?: string
          user_id: string
          user_message: string
        }
        Update: {
          assistant_response?: string
          id?: string
          timestamp?: string
          user_id?: string
          user_message?: string
        }
        Relationships: []
      }
      trading_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          order_type: string
          price: number | null
          quantity: number
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          order_type: string
          price?: number | null
          quantity: number
          status: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_portfolios: {
        Row: {
          cash: number
          equity: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cash: number
          equity: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cash?: number
          equity?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_positions: {
        Row: {
          cost_basis: number
          id: string
          market_value: number
          quantity: number
          symbol: string
          unrealized_pl: number
          unrealized_plpc: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_basis: number
          id?: string
          market_value: number
          quantity: number
          symbol: string
          unrealized_pl: number
          unrealized_plpc: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_basis?: number
          id?: string
          market_value?: number
          quantity?: number
          symbol?: string
          unrealized_pl?: number
          unrealized_plpc?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          profession: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_watchlists: {
        Row: {
          added_date: string
          company_name: string
          id: string
          notes: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          added_date?: string
          company_name: string
          id?: string
          notes?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          added_date?: string
          company_name?: string
          id?: string
          notes?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_trading_conversations: {
        Args: {
          user_id_param: string
        }
        Returns: {
          id: string
          user_id: string
          user_message: string
          assistant_response: string
          message_timestamp: string
        }[]
      }
      get_trading_orders: {
        Args: {
          user_id_param: string
        }
        Returns: {
          id: string
          user_id: string
          order_id: string
          symbol: string
          quantity: number
          price: number
          order_type: string
          status: string
          created_at: string
        }[]
      }
      get_trading_portfolio: {
        Args: {
          user_id_param: string
        }
        Returns: {
          id: string
          user_id: string
          equity: number
          cash: number
          updated_at: string
        }[]
      }
      get_trading_positions: {
        Args: {
          user_id_param: string
        }
        Returns: {
          id: string
          user_id: string
          symbol: string
          quantity: number
          market_value: number
          cost_basis: number
          unrealized_pl: number
          unrealized_plpc: number
          updated_at: string
        }[]
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
