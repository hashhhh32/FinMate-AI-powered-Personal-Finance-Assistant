import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MarketIndex {
  name: string;
  symbol: string;
  price: number;
  change: number | null;
  change_percent: number | null;
  updated_at: string;
}

export function MarketIndicators() {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(price);
  };

  const fetchIndianMarketData = async () => {
    try {
      setIsRefreshing(true);
      
      // First try to get cached data from the database
      const { data: cachedData, error: dbError } = await supabase
        .from('market_indicators')
        .select('*')
        .order('name');

      if (cachedData && cachedData.length > 0) {
        setIndices(cachedData);
      }

      // Then fetch fresh data from the Edge Function
      const { data: response, error } = await supabase.functions.invoke('fetch-indian-market-data');
      
      if (error) {
        console.error('Error fetching Indian market data:', error);
        toast({
          title: "Error fetching market data",
          description: "Using cached data. Please try again later.",
          variant: "destructive"
        });
        return;
      }

      if (response?.data) {
        const marketData = Object.entries(response.data).map(([name, data]: [string, any]) => ({
          name,
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          change_percent: data.changePercent,
          updated_at: response.timestamp
        }));
        setIndices(marketData);
      }
    } catch (error) {
      console.error('Error fetching Indian market data:', error);
      toast({
        title: "Error updating market data",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIndianMarketData();
    
    // Set up real-time subscription
    const marketChannel = supabase
      .channel('market-indicators')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'market_indicators'
        },
        (payload: { new: MarketIndex }) => {
          if (payload.new) {
            setIndices(current =>
              current.map(index =>
                index.name === payload.new.name
                  ? payload.new
                  : index
              )
            );
          }
        }
      )
      .subscribe();

    // Auto-refresh during market hours (9:15 AM to 3:30 PM IST)
    const checkMarketHours = () => {
      const now = new Date();
      const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hours = indiaTime.getHours();
      const minutes = indiaTime.getMinutes();
      
      return (hours > 9 || (hours === 9 && minutes >= 15)) && 
             (hours < 15 || (hours === 15 && minutes <= 30));
    };

    const startAutoRefresh = () => {
      if (checkMarketHours()) {
        const interval = setInterval(fetchIndianMarketData, 5 * 60 * 1000); // Refresh every 5 minutes
        return () => clearInterval(interval);
      }
    };

    const refreshInterval = startAutoRefresh();
    return () => {
      supabase.removeChannel(marketChannel);
      if (refreshInterval) refreshInterval();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Indian Market Indicators</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchIndianMarketData}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {indices.map((index) => (
          <Card key={index.name}>
            <CardContent className="p-6">
              <div className="flex flex-col space-y-2">
                <span className="text-sm text-muted-foreground">{index.name}</span>
                <span className="text-2xl font-bold">{formatPrice(index.price)}</span>
                <div className="flex items-center space-x-2">
                  {index.change !== null && index.change_percent !== null && (
                    <>
                      {index.change >= 0 ? (
                        <div className="flex items-center text-green-500">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          <span>+{index.change.toFixed(2)} (+{index.change_percent.toFixed(2)}%)</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          <span>{index.change.toFixed(2)} ({index.change_percent.toFixed(2)}%)</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Last updated: {new Date(index.updated_at).toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
