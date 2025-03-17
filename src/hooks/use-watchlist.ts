
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type WatchlistItem = {
  id: string;
  symbol: string;
  company_name: string;
  added_date: string;
  notes?: string;
};

type SearchResult = {
  symbol: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  matchScore: string;
};

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch user's watchlist
  const fetchWatchlist = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('user_watchlists')
        .select('*')
        .order('added_date', { ascending: false });
      
      if (error) throw error;
      
      setWatchlist(data || []);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Error fetching watchlist:", error);
      toast({
        title: "Error fetching watchlist",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Add stock to watchlist
  const addToWatchlist = async (symbol: string, companyName: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage your watchlist",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: user.id,
          symbol,
          company_name: companyName,
        })
        .select();
      
      if (error) {
        // Check if it's a unique constraint violation (stock already in watchlist)
        if (error.code === '23505') {
          toast({
            title: "Already in watchlist",
            description: `${symbol} is already in your watchlist`,
          });
          return;
        }
        throw error;
      }
      
      toast({
        title: "Added to watchlist",
        description: `${symbol} has been added to your watchlist`,
      });
      
      setWatchlist([...watchlist, data[0]]);
    } catch (error: any) {
      console.error("Error adding to watchlist:", error);
      toast({
        title: "Error adding to watchlist",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Remove stock from watchlist
  const removeFromWatchlist = async (id: string, symbol: string) => {
    try {
      const { error } = await supabase
        .from('user_watchlists')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Removed from watchlist",
        description: `${symbol} has been removed from your watchlist`,
      });
      
      setWatchlist(watchlist.filter(item => item.id !== id));
    } catch (error: any) {
      console.error("Error removing from watchlist:", error);
      toast({
        title: "Error removing from watchlist",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Search for stocks using Alpha Vantage API
  const searchStocks = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Call the Supabase Edge Function to search for stocks
      const { data, error } = await supabase.functions.invoke('search-stocks', {
        body: { query }
      });
      
      if (error) throw error;
      
      setSearchResults(data?.matches || []);
      setIsSearching(false);
    } catch (error: any) {
      console.error("Error searching stocks:", error);
      toast({
        title: "Error searching stocks",
        description: error.message,
        variant: "destructive"
      });
      setIsSearching(false);
    }
  };

  // Initialize and set up realtime subscription
  useEffect(() => {
    if (user) {
      fetchWatchlist();

      // Set up realtime subscription
      const watchlistChannel = supabase
        .channel('user_watchlists_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_watchlists'
          },
          (payload) => {
            console.log('Realtime watchlist update:', payload);
            fetchWatchlist();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(watchlistChannel);
      };
    } else {
      setWatchlist([]);
    }
  }, [user]);

  return {
    watchlist,
    isLoading,
    searchResults,
    isSearching,
    searchStocks,
    addToWatchlist,
    removeFromWatchlist,
    fetchWatchlist
  };
}
