export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      market_indicators: {
        Row: {
          id: string
          name: string
          symbol: string
          price: number
          change: number
          change_percent: number
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          symbol: string
          price: number
          change: number
          change_percent: number
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          symbol?: string
          price?: number
          change?: number
          change_percent?: number
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      // ... other tables
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 