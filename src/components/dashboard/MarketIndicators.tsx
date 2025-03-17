
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart4 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MarketIndex = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
};

export function MarketIndicators() {
  const [indices, setIndices] = useState<MarketIndex[]>([
    {
      symbol: 'SPY',
      name: 'S&P 500',
      price: 0,
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'QQQ',
      name: 'NASDAQ',
      price: 0,
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString()
    },
    {
      symbol: 'DIA',
      name: 'Dow Jones',
      price: 0,
      change: 0,
      changePercent: 0,
      lastUpdated: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMarketIndices = async () => {
    try {
      setIsLoading(true);
      
      // Call the Supabase Edge Function to fetch market indices
      const { data, error } = await supabase.functions.invoke('fetch-market-indices', {
        body: { symbols: indices.map(index => index.symbol) }
      });
      
      if (error) throw error;
      
      if (data && data.indices) {
        setIndices(data.indices);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching market indices:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketIndices();
    
    // Refresh market indices every 5 minutes
    const intervalId = setInterval(fetchMarketIndices, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Market Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {indices.map((index) => (
            <div key={index.symbol} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{index.name}</h4>
                <BarChart4 className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <div className="text-2xl font-bold">
                ${isLoading ? '---' : index.price.toFixed(2)}
              </div>
              
              <div className={`flex items-center ${index.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {index.change >= 0 ? (
                  <TrendingUp className="mr-1 h-4 w-4" />
                ) : (
                  <TrendingDown className="mr-1 h-4 w-4" />
                )}
                <span>
                  {index.change >= 0 ? '+' : ''}
                  {isLoading ? '---' : index.change.toFixed(2)} ({isLoading ? '---' : index.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
