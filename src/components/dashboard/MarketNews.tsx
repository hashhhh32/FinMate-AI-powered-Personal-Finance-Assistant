
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExternalLink, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWatchlist } from "@/hooks/use-watchlist";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_at: string;
  topics: string[];
  tickers: string[];
};

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { watchlist } = useWatchlist();

  const fetchNews = async () => {
    try {
      setIsLoading(true);
      
      // Get watchlist symbols for filtering
      const watchlistSymbols = watchlist.map(item => item.symbol);
      
      // Call the Supabase Edge Function to fetch financial news
      const { data, error } = await supabase.functions.invoke('fetch-financial-news', {
        body: { watchlistSymbols }
      });
      
      if (error) throw error;
      
      if (data && data.news) {
        setNews(data.news);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching financial news:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    
    // Refresh news every 30 minutes
    const intervalId = setInterval(fetchNews, 30 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [watchlist]);

  // Filter news related to watchlist stocks
  const watchlistNews = news.filter(item => 
    item.tickers && item.tickers.some(ticker => 
      watchlist.some(stock => stock.symbol === ticker)
    )
  );

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  // Render a news card
  const renderNewsCard = (item: NewsItem) => (
    <Card key={item.id} className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
        <CardDescription className="flex items-center text-sm">
          <span className="font-medium">{item.source}</span> 
          <Clock className="ml-2 mr-1 h-3 w-3" />
          <span>{getRelativeTime(item.published_at)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{item.summary}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {item.tickers && item.tickers.slice(0, 5).map(ticker => (
            <Badge key={ticker} variant="secondary">{ticker}</Badge>
          ))}
        </div>
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-primary flex items-center hover:underline"
        >
          Read full article
          <ExternalLink className="ml-1 h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial News</CardTitle>
        <CardDescription>Latest market updates and stock-specific news</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General Market</TabsTrigger>
            <TabsTrigger value="watchlist">Watchlist News</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-5 bg-muted rounded w-12"></div>
                        <div className="h-5 bg-muted rounded w-12"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : news.length > 0 ? (
              <div>
                {news.slice(0, 5).map(renderNewsCard)}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No financial news available.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="watchlist" className="space-y-4">
            {watchlist.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Add stocks to your watchlist to see related news.</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2">
                      <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                      <div className="flex gap-2">
                        <div className="h-5 bg-muted rounded w-12"></div>
                        <div className="h-5 bg-muted rounded w-12"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : watchlistNews.length > 0 ? (
              <div>
                {watchlistNews.map(renderNewsCard)}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No news related to your watchlist stocks.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
