export interface Database {
  public: {
    Tables: {
      market_indicators: {
        Row: {
          id: string;
          name: string;
          symbol: string;
          price: number;
          change: number;
          change_percent: number;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          symbol: string;
          price: number;
          change: number;
          change_percent: number;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          symbol?: string;
          price?: number;
          change?: number;
          change_percent?: number;
          updated_at?: string;
          created_at?: string;
        };
      };
      // ... other tables ...
    };
  };
} 