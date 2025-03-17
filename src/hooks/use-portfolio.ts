import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PortfolioHolding, PortfolioTransaction, PortfolioSummary, AssetAllocation } from "@/types/expense";

export function usePortfolio() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummary>({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitPercentage: 0,
  });
  const [assetAllocation, setAssetAllocation] = useState<AssetAllocation[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Fetch portfolio holdings
    fetchPortfolio();

    // Set up real-time subscription for holdings
    const holdingsChannel = supabase
      .channel('holdings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_holdings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setHoldings((prev) => [payload.new as PortfolioHolding, ...prev]);
            updatePortfolioSummary([...holdings, payload.new as PortfolioHolding]);
          } else if (payload.eventType === 'UPDATE') {
            setHoldings((prev) => 
              prev.map((holding) => 
                holding.id === payload.new.id ? payload.new as PortfolioHolding : holding
              )
            );
            updatePortfolioSummary(
              holdings.map((holding) => 
                holding.id === payload.new.id ? payload.new as PortfolioHolding : holding
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setHoldings((prev) => 
              prev.filter((holding) => holding.id !== payload.old.id)
            );
            updatePortfolioSummary(
              holdings.filter((holding) => holding.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // Set up real-time subscription for transactions
    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_transactions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTransactions((prev) => [payload.new as PortfolioTransaction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTransactions((prev) => 
              prev.map((transaction) => 
                transaction.id === payload.new.id ? payload.new as PortfolioTransaction : transaction
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setTransactions((prev) => 
              prev.filter((transaction) => transaction.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(holdingsChannel);
      supabase.removeChannel(transactionsChannel);
    };
  }, [user]);

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      
      // Fetch holdings
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('portfolio_holdings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (holdingsError) throw holdingsError;
      
      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('portfolio_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (transactionsError) throw transactionsError;
      
      const formattedHoldings = holdingsData?.map(holding => ({
        ...holding,
        shares: Number(holding.shares),
        purchase_price: Number(holding.purchase_price),
        current_price: holding.current_price ? Number(holding.current_price) : null
      })) || [];

      const formattedTransactions = transactionsData?.map(transaction => ({
        ...transaction,
        shares: Number(transaction.shares),
        price: Number(transaction.price),
        transaction_type: transaction.transaction_type as 'buy' | 'sell'
      })) || [];
      
      setHoldings(formattedHoldings);
      setTransactions(formattedTransactions);
      updatePortfolioSummary(formattedHoldings);
      calculateAssetAllocation(formattedHoldings);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error fetching portfolio",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const updatePortfolioSummary = (currentHoldings: PortfolioHolding[]) => {
    let totalValue = 0;
    let totalCost = 0;

    currentHoldings.forEach(holding => {
      const currentPrice = holding.current_price || holding.purchase_price;
      const holdingValue = holding.shares * currentPrice;
      const holdingCost = holding.shares * holding.purchase_price;
      
      totalValue += holdingValue;
      totalCost += holdingCost;
    });

    const totalProfit = totalValue - totalCost;
    const profitPercentage = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    setPortfolioSummary({
      totalValue,
      totalCost,
      totalProfit,
      profitPercentage
    });
  };

  const calculateAssetAllocation = (currentHoldings: PortfolioHolding[]) => {
    // Group holdings by symbol
    const holdingsBySymbol = currentHoldings.reduce((acc, holding) => {
      const symbolExists = acc.findIndex(item => item.name === holding.symbol);
      
      const currentPrice = holding.current_price || holding.purchase_price;
      const holdingValue = holding.shares * currentPrice;
      
      if (symbolExists >= 0) {
        acc[symbolExists].value += holdingValue;
      } else {
        acc.push({
          name: holding.symbol,
          value: holdingValue,
          color: getRandomColor()
        });
      }
      
      return acc;
    }, [] as AssetAllocation[]);
    
    setAssetAllocation(holdingsBySymbol);
  };

  const getRandomColor = () => {
    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
      "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#0ea5e9"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const addHolding = async (newHolding: Omit<PortfolioHolding, 'id' | 'created_at' | 'last_updated' | 'current_price'>) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_holdings')
        .insert([
          { 
            ...newHolding,
            current_price: null,
            user_id: user?.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Also create a buy transaction for this holding
      await addTransaction({
        holding_id: data[0].id,
        symbol: newHolding.symbol,
        transaction_type: 'buy',
        shares: newHolding.shares,
        price: newHolding.purchase_price,
        transaction_date: newHolding.purchase_date
      });
      
      toast({
        title: "Holding added",
        description: `${newHolding.shares} shares of ${newHolding.symbol} has been added to your portfolio`
      });
      
      return data[0];
    } catch (error: any) {
      toast({
        title: "Error adding holding",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateHolding = async (id: string, updatedHolding: Partial<PortfolioHolding>) => {
    try {
      const { error } = await supabase
        .from('portfolio_holdings')
        .update(updatedHolding)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Holding updated",
        description: "Your holding has been successfully updated"
      });
    } catch (error: any) {
      toast({
        title: "Error updating holding",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteHolding = async (id: string) => {
    try {
      // First check if there are transactions related to this holding
      const { data: transactions } = await supabase
        .from('portfolio_transactions')
        .select('id')
        .eq('holding_id', id);

      // Delete all transactions related to this holding
      if (transactions && transactions.length > 0) {
        const { error: transactionError } = await supabase
          .from('portfolio_transactions')
          .delete()
          .eq('holding_id', id);
        
        if (transactionError) throw transactionError;
      }
      
      // Now delete the holding
      const { error } = await supabase
        .from('portfolio_holdings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Holding deleted",
        description: "Your holding has been successfully deleted"
      });
    } catch (error: any) {
      toast({
        title: "Error deleting holding",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addTransaction = async (newTransaction: Omit<PortfolioTransaction, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('portfolio_transactions')
        .insert([
          { 
            ...newTransaction,
            user_id: user?.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Update the holding if it's an existing one
      if (newTransaction.holding_id) {
        const holding = holdings.find(h => h.id === newTransaction.holding_id);
        
        if (holding) {
          let updatedShares = holding.shares;
          
          if (newTransaction.transaction_type === 'buy') {
            updatedShares += newTransaction.shares;
          } else if (newTransaction.transaction_type === 'sell') {
            updatedShares -= newTransaction.shares;
          }
          
          if (updatedShares <= 0) {
            // If shares become zero or negative, delete the holding
            await deleteHolding(newTransaction.holding_id);
          } else {
            // Otherwise update the holding with new share count
            await updateHolding(newTransaction.holding_id, {
              shares: updatedShares
            });
          }
        }
      }
      
      toast({
        title: "Transaction added",
        description: `${newTransaction.transaction_type === 'buy' ? 'Buy' : 'Sell'} transaction for ${newTransaction.shares} shares of ${newTransaction.symbol} has been recorded`
      });
      
      return data[0];
    } catch (error: any) {
      toast({
        title: "Error adding transaction",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateStockPrices = async () => {
    try {
      const symbols = [...new Set(holdings.map(h => h.symbol))];
      
      if (symbols.length === 0) return;
      
      // In a real app, you would fetch prices from an API
      // For this demo, we'll simulate price updates with random changes
      const priceUpdates = holdings.map(holding => {
        const currentPrice = holding.current_price || holding.purchase_price;
        const priceChange = (Math.random() - 0.45) * 0.05; // -2.5% to +2.5% change
        const newPrice = currentPrice * (1 + priceChange);
        
        return {
          id: holding.id,
          current_price: parseFloat(newPrice.toFixed(2)),
          last_updated: new Date().toISOString()
        };
      });
      
      // Update prices in database
      for (const update of priceUpdates) {
        await supabase
          .from('portfolio_holdings')
          .update({
            current_price: update.current_price,
            last_updated: update.last_updated
          })
          .eq('id', update.id);
      }
      
      toast({
        title: "Prices updated",
        description: "Stock prices have been refreshed"
      });
      
      await fetchPortfolio();
    } catch (error: any) {
      toast({
        title: "Error updating prices",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    holdings,
    transactions,
    isLoading,
    portfolioSummary,
    assetAllocation,
    addHolding,
    updateHolding,
    deleteHolding,
    addTransaction,
    fetchPortfolio,
    updateStockPrices
  };
}
