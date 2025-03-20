import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Define types
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface Database {
  public: {
    Tables: {
      conversation_history: {
        Row: {
          id: string;
          user_id: string;
          messages: ChatMessage[];
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages?: ChatMessage[];
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: ChatMessage[];
          last_updated?: string;
          created_at?: string;
        };
      };
      // ... other existing tables ...
    };
  };
}

// Type the supabase client
const typedSupabase = supabase as unknown as ReturnType<typeof createClient<Database>>;

export type TradeOrder = {
  id: string;
  order_id: string;
  symbol: string;
  quantity: number;
  price: number | null;
  order_type: 'buy' | 'sell';
  status: string;
  created_at: string;
};

export type Position = {
  symbol: string;
  quantity: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
};

export type Portfolio = {
  equity: number;
  cash: number;
  positions: Position[];
  updated_at: string;
};

export type TradingAssistantResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export type TradingPortfolio = {
  id: string;
  user_id: string;
  equity: number;
  cash: number;
  updated_at: string;
};

export type TradingPosition = {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  market_value: number;
  cost_basis: number;
  unrealized_pl: number;
  unrealized_plpc: number;
  updated_at: string;
};

export type TradingOrder = {
  id: string;
  user_id: string;
  order_id: string;
  symbol: string;
  quantity: number;
  price: number | null;
  order_type: string;
  status: string;
  created_at: string;
};

export type TradingConversation = {
  id: string;
  user_id: string;
  user_message: string;
  assistant_response: string;
  message_timestamp: string;
};

export function useTrading() {
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [recentOrders, setRecentOrders] = useState<TradeOrder[]>([]);
  const [conversations, setConversations] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user's data on initial load
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchPortfolio(),
        fetchRecentOrders(),
        fetchConversations()
      ]).finally(() => {
        setIsLoadingHistory(false);
      });
    }
  }, [user]);

  // Set up realtime subscription for conversation updates
  useEffect(() => {
    if (!user) return;

    const conversationsChannel = supabase
      .channel('conversation-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_history',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh conversations when they change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationsChannel);
    };
  }, [user]);

  // Fetch conversation history
  const fetchConversations = async () => {
    if (!user) return;

    try {
      console.log('Fetching conversations for user:', user.id);
      
      const { data, error } = await typedSupabase
        .from('conversation_history')
        .select('messages')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No conversations yet, initialize with empty array
          setConversations([]);
          return;
        }
        console.error('Error fetching conversations:', error);
        throw error;
      }
      
      if (data?.messages) {
        // Sort messages by timestamp
        const sortedMessages = [...data.messages].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setConversations(sortedMessages);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error fetching conversation history",
        description: "Failed to load your previous conversations",
        variant: "destructive"
      });
    }
  };

  // Fetch portfolio data from Supabase
  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setIsLoadingPortfolio(true);
      
      console.log('Fetching portfolio data for user:', user.id);
      
      // Fetch portfolio summary
      const { data: portfolioData, error: portfolioError } = await supabase
        .rpc('get_trading_portfolio', { user_id_param: user.id });
      
      if (portfolioError) {
        console.error('Portfolio fetch error:', portfolioError);
        // If no portfolio found, it might be the first time
        if (portfolioError.code !== 'PGRST116') {
          throw portfolioError;
        }
      }
      
      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .rpc('get_trading_positions', { user_id_param: user.id });
      
      if (positionsError) {
        console.error('Positions fetch error:', positionsError);
        throw positionsError;
      }
      
      console.log('Fetched portfolio data:', { portfolioData, positionsData });
      
      if (portfolioData && portfolioData.length > 0) {
        setPortfolio({
          equity: portfolioData[0].equity,
          cash: portfolioData[0].cash,
          positions: positionsData || [],
          updated_at: portfolioData[0].updated_at
        });
      } else if (positionsData && positionsData.length > 0) {
        // If we have positions but no portfolio summary, calculate totals
        const totalMarketValue = positionsData.reduce((sum, pos) => sum + pos.market_value, 0);
        setPortfolio({
          equity: totalMarketValue, // This is approximate
          cash: 0, // We don't know cash without portfolio summary
          positions: positionsData,
          updated_at: positionsData[0].updated_at
        });
      } else {
        // No portfolio data found
        setPortfolio(null);
      }
      
      setIsLoadingPortfolio(false);
    } catch (error: any) {
      console.error('Error fetching portfolio:', error);
      toast({
        title: "Error fetching portfolio",
        description: error.message,
        variant: "destructive"
      });
      setIsLoadingPortfolio(false);
    }
  };

  // Fetch recent orders
  const fetchRecentOrders = async () => {
    if (!user) return;

    try {
      console.log('Fetching recent orders for user:', user.id);
      
      const { data, error } = await supabase
        .rpc('get_trading_orders', { user_id_param: user.id });
      
      if (error) {
        console.error('Orders fetch error:', error);
        throw error;
      }
      
      console.log('Fetched orders data:', data);
      
      // Type casting to ensure order_type is properly typed
      const typedOrders = data ? data.map(order => ({
        ...order,
        order_type: order.order_type.toLowerCase() === 'buy' ? 'buy' : 'sell'
      } as TradeOrder)) : [];
      
      setRecentOrders(typedOrders);
    } catch (error: any) {
      console.error('Error fetching recent orders:', error);
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Send message to trading assistant
  const sendMessage = async (message: string, messageType: 'text' | 'voice' = 'text'): Promise<TradingAssistantResponse> => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to use the trading assistant",
        variant: "destructive"
      });
      return {
        success: false,
        message: "Please sign in to use the trading assistant"
      };
    }

    try {
      setIsProcessing(true);
      
      console.log('Sending message to trading assistant:', { message, userId: user.id, messageType });
      
      const response = await supabase.functions.invoke('trading-assistant', {
        body: {
          message,
          userId: user.id,
          messageType
        }
      });
      
      console.log('Response from trading assistant:', response);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const result = response.data as TradingAssistantResponse;
      
      // Update local conversations state
      setConversations(prev => [
        ...prev,
        {
          role: 'user',
          content: message,
          timestamp: new Date().toISOString()
        },
        {
          role: 'assistant',
          content: result.message,
          timestamp: new Date().toISOString()
        }
      ]);
      
      // If this was a portfolio-related action, refresh the data
      if (message.toLowerCase().includes('portfolio') || 
          result.message.toLowerCase().includes('portfolio') ||
          message.toLowerCase().includes('buy') ||
          message.toLowerCase().includes('sell')) {
        await Promise.all([
          fetchPortfolio(),
          fetchRecentOrders()
        ]);
      }
      
      setIsProcessing(false);
      return result;
    } catch (error: any) {
      console.error('Error sending message to trading assistant:', error);
      toast({
        title: "Error processing request",
        description: error.message,
        variant: "destructive"
      });
      setIsProcessing(false);
      return {
        success: false,
        message: `Sorry, I encountered an error processing your request: ${error.message}`
      };
    }
  };

  return {
    portfolio,
    isLoadingPortfolio,
    isProcessing,
    isLoadingHistory,
    recentOrders,
    conversations,
    sendMessage,
    refreshPortfolio: fetchPortfolio,
    refreshOrders: fetchRecentOrders,
    refreshConversations: fetchConversations
  };
}
