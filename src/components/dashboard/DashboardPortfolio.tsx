import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePortfolio } from "@/hooks/use-portfolio";
import { PortfolioHolding } from "@/types/expense";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Plus, 
  RefreshCcw, 
  Trash2, 
  Edit, 
  Check, 
  X,
  DollarSign,
  Calendar
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTrading } from "@/hooks/use-trading";

// Add type definition for transactions
interface PortfolioTransaction {
  id: string;
  symbol: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  transaction_date: string;
  total: number;
}

// Environment variables
const ALPACA_API_KEY = import.meta.env.VITE_ALPACA_API_KEY || '';
const ALPACA_API_SECRET = import.meta.env.VITE_ALPACA_SECRET_KEY || '';
const ALPACA_API_URL = 'https://data.alpaca.markets';

const DashboardPortfolio = () => {
  const { user } = useAuth();
  const [userPortfolio, setUserPortfolio] = useState<any[]>([]);
  const [isLoadingUserPortfolio, setIsLoadingUserPortfolio] = useState(true);
  const [transactions, setTransactions] = useState<PortfolioTransaction[]>([]);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitPercentage: 0
  });
  const [assetAllocation, setAssetAllocation] = useState<any[]>([]);

  const { 
    holdings, 
    transactions: portfolioTransactions, 
    isLoading, 
    addHolding,
    updateHolding,
    deleteHolding,
    addTransaction,
    updateStockPrices,
    fetchPortfolio
  } = usePortfolio();

  const { portfolio: tradingPortfolio, isLoadingPortfolio } = useTrading();

  const [isAddingHolding, setIsAddingHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({
    symbol: '',
    company_name: '',
    shares: 0,
    purchase_price: 0,
    purchase_date: new Date().toISOString()
  });
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<PortfolioHolding>>({});
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    holding_id: '',
    symbol: '',
    transaction_type: 'buy' as 'buy' | 'sell',
    shares: 0,
    price: 0,
    transaction_date: new Date().toISOString()
  });

  // Function to update portfolio summary
  const updatePortfolioSummary = (summary: typeof portfolioSummary) => {
    setPortfolioSummary(summary);
  };

  // Function to update asset allocation
  const updateAssetAllocation = (allocation: any[]) => {
    setAssetAllocation(allocation);
  };

  // Function to safely format number with fallback
  const safeNumberFormat = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return '0.00';
    return Number(value).toFixed(decimals);
  };

  // Function to fetch user portfolio with correct calculations
  const fetchUserPortfolio = async () => {
    if (!user?.id) {
      console.log('No user ID found');
      return;
    }
    
    try {
      setIsLoadingUserPortfolio(true);
      console.log('Fetching portfolio for user:', user.id);

      // Get current positions
      const { data: positionsData, error: positionsError } = await supabase
        .from('trading_positions')
        .select('*')
        .eq('user_id', user.id);

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        toast.error('Failed to load positions data');
        return;
      }

      // Process positions data
      const positions = positionsData.map(position => ({
        ...position,
        total_value: position.cost_basis * position.quantity,
        market_value: position.market_value,
        unrealized_pl: position.unrealized_pl,
        unrealized_plpc: position.unrealized_plpc
      }));

      console.log('Processed portfolio data:', { positions });
      setUserPortfolio(positions);

      // Calculate portfolio summary
      const totalValue = positions.reduce((sum, pos) => sum + (pos.cost_basis * pos.quantity), 0);
      const totalMarketValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
      const totalProfit = positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0);
      const profitPercentage = totalValue > 0 ? (totalProfit / totalValue) * 100 : 0;

      setPortfolioSummary({
        totalValue: totalMarketValue,
        totalCost: totalValue,
        totalProfit,
        profitPercentage
      });

      // Calculate asset allocation
      const allocation = positions.map(position => ({
        name: position.symbol,
        value: position.market_value,
        color: getRandomColor()
      }));
      setAssetAllocation(allocation);

    } catch (error) {
      console.error('Error in fetchUserPortfolio:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setIsLoadingUserPortfolio(false);
    }
  };

  // Set up real-time subscription for portfolio updates
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to portfolio changes
    const portfolioSubscription = supabase
      .channel('portfolio_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_portfolios',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Portfolio updated, refreshing data...');
          fetchUserPortfolio();
        }
      )
      .subscribe();

    // Subscribe to position changes
    const positionsSubscription = supabase
      .channel('position_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_positions',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('Positions updated, refreshing data...');
          fetchUserPortfolio();
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      portfolioSubscription.unsubscribe();
      positionsSubscription.unsubscribe();
    };
  }, [user?.id]);

  // Fetch portfolio when component mounts or user changes
  useEffect(() => {
    fetchUserPortfolio();
  }, [user?.id]);

  // Function to update prices from Alpaca API
  const updatePrices = async () => {
    try {
      if (!user?.id) return;

      // Get all unique symbols from positions
      const { data: positions, error: positionsError } = await supabase
        .from('trading_positions')
        .select('symbol')
        .eq('user_id', user.id);

      if (positionsError) {
        console.error('Error fetching positions:', positionsError);
        return;
      }

      if (!positions?.length) return;

      const symbols = positions.map(p => p.symbol);
      console.log('Fetching prices for symbols:', symbols);

      // Fetch prices from Alpaca API
      const response = await fetch(`${ALPACA_API_URL}/v2/stocks/quotes/latest?symbols=${symbols.join(',')}`, {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`);
      }

      const data = await response.json();

      // Update prices in database
      for (const symbol of symbols) {
        const quote = data[symbol];
        if (quote?.ap || quote?.bp) { // Use ask price or bid price
          const currentPrice = quote.ap || quote.bp;
          
          const { error: updateError } = await supabase.rpc('update_position_price', {
            p_user_id: user.id,
            p_symbol: symbol,
            p_current_price: currentPrice
          });

          if (updateError) {
            console.error(`Error updating price for ${symbol}:`, updateError);
          }
        }
      }

      // Refresh portfolio data
      await fetchUserPortfolio();
      
      toast.success('Prices updated successfully');
    } catch (error) {
      console.error('Error updating prices:', error);
      toast.error('Failed to update prices');
    }
  };

  // Set up automatic price updates
  useEffect(() => {
    if (!user?.id) return;

    // Update prices immediately
    updatePrices();

    // Set up interval for price updates (every 10 seconds)
    const intervalId = setInterval(updatePrices, 10000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [user?.id]);

  // Function to calculate average purchase price for a symbol
  const calculateAveragePurchasePrice = (symbol: string) => {
    const symbolTransactions = portfolioTransactions.filter(t => t.symbol === symbol);
    if (symbolTransactions.length === 0) return 0;

    let totalShares = 0;
    let totalCost = 0;

    symbolTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'buy') {
        totalShares += transaction.shares;
        totalCost += transaction.shares * transaction.price;
      } else if (transaction.transaction_type === 'sell') {
        totalShares -= transaction.shares;
        totalCost -= transaction.shares * transaction.price;
      }
    });

    return totalShares > 0 ? totalCost / totalShares : 0;
  };

  // Function to get current price from trading portfolio
  const getCurrentPrice = (symbol: string) => {
    if (tradingPortfolio) {
      const position = tradingPortfolio.positions.find(p => p.symbol === symbol);
      if (position) {
        return position.market_value / position.quantity;
      }
    }
    return null;
  };

  // Update holdings with real-time prices
  useEffect(() => {
    if (tradingPortfolio && !isLoadingPortfolio) {
      holdings.forEach(holding => {
        const currentPrice = getCurrentPrice(holding.symbol);
        if (currentPrice) {
          updateHolding(holding.id, {
            current_price: currentPrice,
            last_updated: new Date().toISOString()
          });
        }
      });
    }
  }, [tradingPortfolio, isLoadingPortfolio]);

  const getRandomColor = () => {
    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", 
      "#06b6d4", "#84cc16", "#ec4899", "#f97316", "#0ea5e9"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['shares', 'purchase_price'];
    
    setNewHolding({
      ...newHolding,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    });
  };

  const handleTransactionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['shares', 'price'];
    
    setNewTransaction({
      ...newTransaction,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numericFields = ['shares', 'purchase_price', 'current_price'];
    
    setEditFormData({
      ...editFormData,
      [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value
    });
  };

  const handleAddHolding = async () => {
    if (!newHolding.symbol || !newHolding.company_name || newHolding.shares <= 0 || newHolding.purchase_price <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }

    await addHolding(newHolding);
    setNewHolding({
      symbol: '',
      company_name: '',
      shares: 0,
      purchase_price: 0,
      purchase_date: new Date().toISOString()
    });
    setIsAddingHolding(false);
  };

  const handleAddTransaction = async () => {
    if (!newTransaction.holding_id || newTransaction.shares <= 0 || newTransaction.price <= 0) {
      toast.error("Please fill all fields with valid values");
      return;
    }

    await addTransaction(newTransaction);
    setNewTransaction({
      holding_id: '',
      symbol: '',
      transaction_type: 'buy',
      shares: 0,
      price: 0,
      transaction_date: new Date().toISOString()
    });
    setIsAddingTransaction(false);
  };

  const startEditing = (holding: PortfolioHolding) => {
    setEditingHoldingId(holding.id);
    setEditFormData({
      symbol: holding.symbol,
      company_name: holding.company_name,
      shares: holding.shares,
      purchase_price: holding.purchase_price,
      current_price: holding.current_price || undefined
    });
  };

  const cancelEditing = () => {
    setEditingHoldingId(null);
    setEditFormData({});
  };

  const saveEditing = async () => {
    if (editingHoldingId) {
      await updateHolding(editingHoldingId, editFormData);
      setEditingHoldingId(null);
      setEditFormData({});
    }
  };

  const prepareTransaction = (holding: PortfolioHolding, type: 'buy' | 'sell') => {
    setNewTransaction({
      holding_id: holding.id,
      symbol: holding.symbol,
      transaction_type: type,
      shares: 0,
      price: holding.current_price || holding.purchase_price,
      transaction_date: new Date().toISOString()
    });
    setIsAddingTransaction(true);
  };

  // Function to calculate profit/loss for a position
  const calculatePositionProfitLoss = (holding: PortfolioHolding) => {
    const position = tradingPortfolio?.positions.find(p => p.symbol === holding.symbol);
    if (!position) return { profit: 0, profitPercentage: 0 };

    // Use the position's unrealized P/L directly from the trading portfolio
    return {
      profit: position.unrealized_pl,
      profitPercentage: position.unrealized_plpc
    };
  };

  // Function to calculate total portfolio profit/loss
  const calculateTotalProfitLoss = () => {
    if (!tradingPortfolio) return { totalProfit: 0, totalProfitPercentage: 0 };

    const totalProfit = tradingPortfolio.positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0);
    const totalProfitPercentage = tradingPortfolio.positions.reduce((sum, pos) => sum + pos.unrealized_plpc, 0) / 
      (tradingPortfolio.positions.length || 1);

    return {
      totalProfit,
      totalProfitPercentage
    };
  };

  const handleTrade = async (symbol: string, quantity: number, type: 'buy' | 'sell') => {
    if (!user?.id) {
      toast.error('Please log in to execute trades');
      return;
    }

    try {
      const response = await fetch('/api/trading-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${type} ${quantity} shares of ${symbol}`,
          userId: user.id,
          messageType: 'trade'
        })
      });

      const data = await response.json();
      
      if (!data.success) {
        if (data.requiresConfirmation) {
          // Show wash sale confirmation dialog
          const confirmed = window.confirm(data.message);
          if (confirmed) {
            // Proceed with trade
            const confirmResponse = await fetch('/api/trading-assistant', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                message: `${type} ${quantity} shares of ${symbol}`,
                userId: user.id,
                messageType: 'trade',
                confirmedWashSale: true
              })
            });
            
            const confirmData = await confirmResponse.json();
            if (confirmData.success) {
              toast.success(confirmData.message);
              // Refresh portfolio data
              fetchUserPortfolio();
            } else {
              toast.error(confirmData.message);
            }
          }
        } else {
          toast.error(data.message);
        }
      } else {
        toast.success(data.message);
        // Refresh portfolio data
        fetchUserPortfolio();
      }
    } catch (error) {
      console.error('Error executing trade:', error);
      toast.error('Failed to execute trade');
    }
  };

  // Function to fetch trading history
  const fetchTradingHistory = async () => {
    if (!user?.id) return;
    
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (historyError) {
        console.error('Error fetching trade history:', historyError);
        toast.error('Failed to load trade history');
        return;
      }

      if (historyData) {
        setTransactions(historyData.map(trade => ({
          id: trade.id,
          symbol: trade.symbol,
          transaction_type: trade.order_type,
          shares: trade.quantity,
          price: trade.price,
          transaction_date: trade.created_at,
          total: trade.quantity * trade.price
        })));
      }
    } catch (error) {
      console.error('Error fetching trade history:', error);
      toast.error('Failed to load trade history');
    }
  };

  // Add useEffect to fetch trading history
  useEffect(() => {
    if (user?.id) {
      fetchTradingHistory();
    }
  }, [user?.id]);

  if (isLoadingUserPortfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading portfolio data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Portfolio Management</h2>
          <p className="text-muted-foreground">
            Track, analyze and optimize your investment portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUserPortfolio}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center mt-1 ${portfolioSummary.profitPercentage >= 0 ? "text-green-500" : "text-red-500"}`}>
              {portfolioSummary.profitPercentage >= 0 ? (
                <TrendingUp className="h-4 w-4 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm">
                {portfolioSummary.profitPercentage >= 0 ? "+" : ""}
                {portfolioSummary.profitPercentage.toFixed(2)}% all time
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Profit/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${portfolioSummary.totalProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {portfolioSummary.totalProfit >= 0 ? "+" : ""}
              ${portfolioSummary.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center mt-1 text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-1" />
              <span className="text-sm">Total cost: ${portfolioSummary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userPortfolio.length}</div>
            <div className="flex items-center mt-1 text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">{userPortfolio.length} positions tracked</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="holdings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="holdings">Your Holdings</TabsTrigger>
          <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings" className="space-y-4">
          {userPortfolio.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Avg. Price</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Profit/Loss</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userPortfolio.map((position) => (
                    <TableRow key={`${position.symbol}-${position.user_id}`}>
                      <TableCell>
                        <div className="font-medium">{position.symbol || 'N/A'}</div>
                      </TableCell>
                      <TableCell>{safeNumberFormat(position.quantity, 0)}</TableCell>
                      <TableCell>${safeNumberFormat(position.cost_basis)}</TableCell>
                      <TableCell>${safeNumberFormat(position.current_price)}</TableCell>
                      <TableCell>
                        <div>${safeNumberFormat(position.total_value)}</div>
                        <div className="text-xs text-muted-foreground">Market: ${safeNumberFormat(position.market_value)}</div>
                      </TableCell>
                      <TableCell className={Number(position.unrealized_pl || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                        <div>
                          {Number(position.unrealized_pl || 0) >= 0 ? "+" : ""}
                          ${safeNumberFormat(position.unrealized_pl)}
                        </div>
                        <div className="text-xs">
                          {Number(position.unrealized_plpc || 0) >= 0 ? "+" : ""}
                          {safeNumberFormat(position.unrealized_plpc)}%
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTrade(position.symbol, 1, 'buy')}
                            disabled={!position.symbol}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTrade(position.symbol, 1, 'sell')}
                            disabled={!position.symbol || Number(position.quantity) <= 0}
                          >
                            <TrendingDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <p className="text-muted-foreground mb-4">You don't have any holdings yet.</p>
                <Button onClick={() => handleTrade('', 0, 'buy')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Investment
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Breakdown of your current investment portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assetAllocation.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocation}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value) => [`$${parseFloat(value as string).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Amount"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Add holdings to see your asset allocation</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {transactions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Shares</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.symbol}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'destructive'}>
                          {transaction.transaction_type.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.shares}</TableCell>
                      <TableCell>${safeNumberFormat(transaction.price)}</TableCell>
                      <TableCell>${safeNumberFormat(transaction.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <p className="text-muted-foreground">No transactions recorded yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPortfolio;