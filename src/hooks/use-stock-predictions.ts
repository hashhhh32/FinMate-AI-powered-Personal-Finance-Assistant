
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Define types for stock data
type HistoricalStockData = {
  id: string;
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type RealtimeStockPrice = {
  id: string;
  symbol: string;
  price: number;
  timestamp: string;
};

type PredictedStockPrice = {
  id: string;
  symbol: string;
  predicted_price: number;
  timestamp: string;
};

export function useStockPredictions() {
  const [historicalData, setHistoricalData] = useState<Record<string, HistoricalStockData[]>>({});
  const [realtimePrices, setRealtimePrices] = useState<Record<string, RealtimeStockPrice>>({});
  const [predictedPrices, setPredictedPrices] = useState<Record<string, PredictedStockPrice[]>>({});
  const [watchlist, setWatchlist] = useState<string[]>(["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Fetch initial data
    fetchStockData();

    // Set up real-time subscriptions
    const realtimePricesChannel = supabase
      .channel('realtime-stock-prices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stock_prices',
          filter: watchlist.map(symbol => `symbol=eq.${symbol}`).join(' OR ')
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stockPrice = payload.new as RealtimeStockPrice;
            setRealtimePrices(prev => ({
              ...prev,
              [stockPrice.symbol]: stockPrice
            }));
          }
        }
      )
      .subscribe();

    const predictedPricesChannel = supabase
      .channel('predicted-stock-prices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predicted_stock_prices',
          filter: watchlist.map(symbol => `symbol=eq.${symbol}`).join(' OR ')
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const prediction = payload.new as PredictedStockPrice;
            setPredictedPrices(prev => {
              const symbolPredictions = prev[prediction.symbol] || [];
              return {
                ...prev,
                [prediction.symbol]: [...symbolPredictions, prediction].sort(
                  (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                )
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimePricesChannel);
      supabase.removeChannel(predictedPricesChannel);
    };
  }, [watchlist]);

  const fetchStockData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch historical data for each stock in watchlist
      const historicalDataBySymbol: Record<string, HistoricalStockData[]> = {};
      
      for (const symbol of watchlist) {
        const { data, error } = await supabase
          .from('historical_stock_data')
          .select('*')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: true })
          .limit(30);
        
        if (error) throw error;
        
        historicalDataBySymbol[symbol] = data || [];
      }
      
      setHistoricalData(historicalDataBySymbol);
      
      // Fetch latest real-time prices
      const { data: latestPrices, error: pricesError } = await supabase
        .from('realtime_stock_prices')
        .select('*')
        .in('symbol', watchlist)
        .order('timestamp', { ascending: false });
      
      if (pricesError) throw pricesError;
      
      const latestPricesBySymbol: Record<string, RealtimeStockPrice> = {};
      
      // Group by symbol and take the latest price for each
      latestPrices?.forEach(price => {
        if (!latestPricesBySymbol[price.symbol] || 
            new Date(price.timestamp) > new Date(latestPricesBySymbol[price.symbol].timestamp)) {
          latestPricesBySymbol[price.symbol] = price;
        }
      });
      
      setRealtimePrices(latestPricesBySymbol);
      
      // Fetch predicted prices
      const { data: predictions, error: predictionsError } = await supabase
        .from('predicted_stock_prices')
        .select('*')
        .in('symbol', watchlist)
        .order('timestamp', { ascending: true });
      
      if (predictionsError) throw predictionsError;
      
      const predictionsBySymbol: Record<string, PredictedStockPrice[]> = {};
      
      // Group predictions by symbol
      predictions?.forEach(prediction => {
        if (!predictionsBySymbol[prediction.symbol]) {
          predictionsBySymbol[prediction.symbol] = [];
        }
        predictionsBySymbol[prediction.symbol].push(prediction);
      });
      
      setPredictedPrices(predictionsBySymbol);
      
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error fetching stock data",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const updateWatchlist = (symbols: string[]) => {
    setWatchlist(symbols);
  };

  // Simulate updating real-time prices (for demo purposes)
  const simulateRealtimeUpdates = async () => {
    try {
      // In a real app, this would be replaced with live API calls
      const updates = watchlist.map(symbol => {
        const currentPrice = realtimePrices[symbol]?.price || 
          (symbol === 'AAPL' ? 174.82 : 
           symbol === 'MSFT' ? 328.79 : 
           symbol === 'NVDA' ? 437.53 : 
           symbol === 'AMZN' ? 132.65 : 
           symbol === 'TSLA' ? 224.57 : 100);
        
        // Random price change between -3% and +3%
        const priceChange = (Math.random() * 0.06 - 0.03) * currentPrice;
        const newPrice = Number((currentPrice + priceChange).toFixed(2));
        
        return {
          symbol,
          price: newPrice,
          timestamp: new Date().toISOString()
        };
      });
      
      // Update prices in database
      for (const update of updates) {
        await supabase
          .from('realtime_stock_prices')
          .upsert([update], { onConflict: 'symbol' });
      }
      
      toast({
        title: "Stock prices updated",
        description: "Latest market data has been refreshed"
      });
      
    } catch (error: any) {
      toast({
        title: "Error updating stock prices",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Generate predictions based on historical data (simplified model for demo)
  const generatePredictions = async () => {
    try {
      const predictions = watchlist.map(symbol => {
        const currentPrice = realtimePrices[symbol]?.price || 100;
        
        // Simple trend-based prediction (7 days into future)
        const futurePredictions = [1, 3, 7].map(days => {
          // Random trend between -5% and +15% (slightly bullish)
          const trend = (Math.random() * 0.20 - 0.05);
          const predictedPrice = Number((currentPrice * (1 + trend)).toFixed(2));
          
          // Calculate future date
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + days);
          
          return {
            symbol,
            predicted_price: predictedPrice,
            timestamp: futureDate.toISOString()
          };
        });
        
        return futurePredictions;
      }).flat();
      
      // Update predictions in database
      for (const prediction of predictions) {
        await supabase
          .from('predicted_stock_prices')
          .insert([prediction]);
      }
      
      toast({
        title: "Predictions generated",
        description: "New stock price predictions have been calculated"
      });
      
      await fetchStockData();
    } catch (error: any) {
      toast({
        title: "Error generating predictions",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    historicalData,
    realtimePrices,
    predictedPrices,
    watchlist,
    isLoading,
    updateWatchlist,
    fetchStockData,
    simulateRealtimeUpdates,
    generatePredictions
  };
}
