import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/use-watchlist";

// Define types for stock data
interface HistoricalStockData {
  id: string;
  symbol: string;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface RealtimeStockPrice {
  id: string;
  symbol: string;
  price: number;
  timestamp: string;
}

interface TechnicalIndicators {
  rsi: number;
  macd: number;
  ema20: number;
  sma50: number;
  sma200: number;
  bollingerUpper: number;
  bollingerLower: number;
  atr: number;
}

interface PredictedStockPrice {
  id: string;
  symbol: string;
  predicted_price: number;
  confidence_level: number;
  risk_level: string;
  recommendation: string;
  prediction_date: string;
  target_date: string;
  model_version: string;
  features_used: TechnicalIndicators;
}

export function useStockPredictions() {
  const [historicalData, setHistoricalData] = useState<Record<string, HistoricalStockData[]>>({});
  const [realtimePrices, setRealtimePrices] = useState<Record<string, RealtimeStockPrice>>({});
  const [predictedPrices, setPredictedPrices] = useState<Record<string, PredictedStockPrice[]>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { watchlist: userWatchlist } = useWatchlist();

  useEffect(() => {
    if (userWatchlist && userWatchlist.length > 0) {
      const symbols = userWatchlist.map(item => item.symbol);
      setWatchlist(symbols);
    } else {
      setWatchlist(["AAPL", "MSFT", "NVDA", "AMZN", "TSLA"]);
    }
  }, [userWatchlist]);

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchStockData();
    }

    // Set up real-time subscriptions
    const realtimePricesChannel = supabase
      .channel('realtime-stock-prices')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stock_prices'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const stockPrice = payload.new as RealtimeStockPrice;
            if (watchlist.includes(stockPrice.symbol)) {
              setRealtimePrices(prev => ({
                ...prev,
                [stockPrice.symbol]: stockPrice
              }));
            }
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
          table: 'stock_predictions'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const prediction = payload.new as PredictedStockPrice;
            if (watchlist.includes(prediction.symbol)) {
              setPredictedPrices(prev => {
                const symbolPredictions = prev[prediction.symbol] || [];
                return {
                  ...prev,
                  [prediction.symbol]: [...symbolPredictions, prediction].sort(
                    (a, b) => new Date(a.prediction_date).getTime() - new Date(b.prediction_date).getTime()
                  )
                };
              });
            }
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
      setFetchError(null);
      
      // Fetch historical data for each stock in watchlist
      const historicalDataBySymbol: Record<string, HistoricalStockData[]> = {};
      
      for (const symbol of watchlist) {
        const { data, error } = await supabase
          .from('historical_stock_data')
          .select('*')
          .eq('symbol', symbol)
          .order('timestamp', { ascending: true })
          .limit(200);
        
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
      latestPrices?.forEach(price => {
        if (!latestPricesBySymbol[price.symbol] || 
            new Date(price.timestamp) > new Date(latestPricesBySymbol[price.symbol].timestamp)) {
          latestPricesBySymbol[price.symbol] = price;
        }
      });
      
      setRealtimePrices(latestPricesBySymbol);
      
      // Fetch latest predictions
      const { data: predictions, error: predictionsError } = await supabase
        .from('stock_predictions')
        .select('*')
        .in('symbol', watchlist)
        .order('prediction_date', { ascending: true });
      
      if (predictionsError) throw predictionsError;
      
      const predictionsBySymbol: Record<string, PredictedStockPrice[]> = {};
      predictions?.forEach(prediction => {
        if (!predictionsBySymbol[prediction.symbol]) {
          predictionsBySymbol[prediction.symbol] = [];
        }
        predictionsBySymbol[prediction.symbol].push(prediction);
      });
      
      setPredictedPrices(predictionsBySymbol);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching stock data:", error);
      toast({
        title: "Error fetching stock data",
        description: error.message,
        variant: "destructive"
      });
      setFetchError(error.message);
      setIsLoading(false);
    }
  };

  const updateWatchlist = (symbols: string[]) => {
    setWatchlist(symbols);
  };

  const fetchRealTimeStockPrices = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('fetch-stock-prices', {
        body: { symbols: watchlist }
      });
      
      if (error) throw error;
      
      if (data && data.prices) {
        toast({
          title: "Stock prices updated",
          description: `Latest market data has been refreshed for ${Object.keys(data.prices).length} stocks`
        });
      }
      
      await fetchStockData();
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error updating stock prices:", error);
      toast({
        title: "Error updating stock prices",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-stock-predictions', {
        body: { symbols: watchlist }
      });
      
      if (error) throw error;
      
      if (data && data.predictions) {
        toast({
          title: "Predictions generated",
          description: "New stock price predictions have been calculated using advanced technical analysis"
        });
      }
      
      await fetchStockData();
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error generating predictions:", error);
      toast({
        title: "Error generating predictions",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return {
    historicalData,
    realtimePrices,
    predictedPrices,
    watchlist,
    isLoading,
    fetchError,
    updateWatchlist,
    fetchStockData,
    fetchRealTimeStockPrices,
    generatePredictions
  };
}
