
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [recentOrders, setRecentOrders] = useState<TradeOrder[]>([]);
  const [conversations, setConversations] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user's portfolio on initial load
  useEffect(() => {
    if (user) {
      fetchPortfolio();
      fetchRecentOrders();
      fetchConversations();
    }
  }, [user]);

  // Set up realtime subscription for portfolio updates
  useEffect(() => {
    if (!user) return;

    const portfolioChannel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_portfolios',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh portfolio data when it changes
          fetchPortfolio();
        }
      )
      .subscribe();

    const positionsChannel = supabase
      .channel('positions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_positions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh portfolio data when positions change
          fetchPortfolio();
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Refresh orders when new ones are added
          fetchRecentOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(portfolioChannel);
      supabase.removeChannel(positionsChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [user]);

  // Fetch portfolio data from Supabase
  const fetchPortfolio = async () => {
    if (!user) return;

    try {
      setIsLoadingPortfolio(true);
      
      // Fetch portfolio summary
      const { data: portfolioData, error: portfolioError } = await supabase
        .rpc('get_trading_portfolio', { user_id_param: user.id })
        .single();
      
      if (portfolioError) {
        // If no portfolio found, it might be the first time
        if (portfolioError.code !== 'PGRST116') {
          throw portfolioError;
        }
      }
      
      // Fetch positions
      const { data: positionsData, error: positionsError } = await supabase
        .rpc('get_trading_positions', { user_id_param: user.id });
      
      if (positionsError) throw positionsError;
      
      if (portfolioData) {
        setPortfolio({
          equity: portfolioData.equity,
          cash: portfolioData.cash,
          positions: positionsData || [],
          updated_at: portfolioData.updated_at
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
      const { data, error } = await supabase
        .rpc('get_trading_orders', { user_id_param: user.id })
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      setRecentOrders(data || []);
    } catch (error: any) {
      console.error('Error fetching recent orders:', error);
      toast({
        title: "Error fetching orders",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Fetch recent conversations
  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .rpc('get_trading_conversations', { user_id_param: user.id })
        .order('message_timestamp', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Format data into user/assistant pairs
      const formattedConversations = data ? data.flatMap(item => [
        {
          role: 'user' as const,
          content: item.user_message,
          timestamp: item.message_timestamp
        },
        {
          role: 'assistant' as const,
          content: item.assistant_response,
          timestamp: item.message_timestamp
        }
      ]) : [];
      
      // Sort by timestamp
      formattedConversations.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      setConversations(formattedConversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
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
      
      const response = await supabase.functions.invoke('trading-assistant', {
        body: {
          message,
          userId: user.id,
          messageType
        }
      });
      
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
    recentOrders,
    conversations,
    sendMessage,
    refreshPortfolio: fetchPortfolio,
    refreshOrders: fetchRecentOrders
  };
}
