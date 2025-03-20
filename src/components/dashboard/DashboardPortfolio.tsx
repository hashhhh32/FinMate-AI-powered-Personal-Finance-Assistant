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

const DashboardPortfolio = () => {
  const { user } = useAuth();
  const [userPortfolio, setUserPortfolio] = useState<any[]>([]);
  const [isLoadingUserPortfolio, setIsLoadingUserPortfolio] = useState(true);
  const [portfolioSummary, setPortfolioSummary] = useState({
    totalValue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitPercentage: 0
  });
  const [assetAllocation, setAssetAllocation] = useState<any[]>([]);

  const { 
    holdings, 
    transactions, 
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

  // Function to fetch user portfolio
  const fetchUserPortfolio = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoadingUserPortfolio(true);
      const { data, error } = await supabase
        .rpc('get_user_portfolio_summary', { p_user_id: user.id });
      
      if (error) {
        console.error('Error fetching user portfolio:', error);
        // Initialize empty portfolio data
        setUserPortfolio([]);
        updatePortfolioSummary({
          totalValue: 0,
          totalCost: 0,
          totalProfit: 0,
          profitPercentage: 0
        });
        updateAssetAllocation([]);
        return;
      }
      
      setUserPortfolio(data || []);
      
      // Update portfolio summary
      const totalValue = data.reduce((sum, pos) => sum + (pos.total_market_value || 0), 0);
      const totalCost = data.reduce((sum, pos) => sum + (pos.total_cost_basis || 0), 0);
      const totalProfit = data.reduce((sum, pos) => sum + (pos.unrealized_pl || 0), 0);
      const profitPercentage = data.length > 0 
        ? data.reduce((sum, pos) => sum + (pos.unrealized_plpc || 0), 0) / data.length
        : 0;
      
      // Update asset allocation
      const newAllocation = data.map(position => ({
        name: position.symbol,
        value: position.total_market_value || 0,
        color: getRandomColor()
      }));
      
      // Update the portfolio data
      updatePortfolioSummary({
        totalValue,
        totalCost,
        totalProfit,
        profitPercentage
      });
      
      updateAssetAllocation(newAllocation);
    } catch (error) {
      console.error('Error fetching user portfolio:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setIsLoadingUserPortfolio(false);
    }
  };

  // Fetch user's portfolio data
  useEffect(() => {
    fetchUserPortfolio();
  }, [user?.id]);

  // Sync trading portfolio data with dashboard portfolio
  useEffect(() => {
    if (tradingPortfolio && !isLoadingPortfolio) {
      // Update holdings based on trading positions
      tradingPortfolio.positions.forEach(position => {
        const existingHolding = holdings.find(h => h.symbol === position.symbol);
        if (existingHolding) {
          updateHolding(existingHolding.id, {
            shares: position.quantity,
            last_updated: new Date().toISOString()
          });
        } else {
          addHolding({
            symbol: position.symbol,
            company_name: position.symbol, // You might want to fetch company name
            shares: position.quantity,
            purchase_price: position.cost_basis / position.quantity,
            purchase_date: new Date().toISOString()
          });
        }
      });

      // Update portfolio summary
      const newSummary = {
        totalValue: tradingPortfolio.equity,
        totalCost: tradingPortfolio.positions.reduce((sum, pos) => sum + pos.cost_basis, 0),
        totalProfit: tradingPortfolio.positions.reduce((sum, pos) => sum + pos.unrealized_pl, 0),
        profitPercentage: tradingPortfolio.positions.reduce((sum, pos) => sum + pos.unrealized_plpc, 0) / tradingPortfolio.positions.length
      };

      // Update asset allocation
      const newAllocation = tradingPortfolio.positions.map(position => ({
        name: position.symbol,
        value: position.market_value,
        color: getRandomColor()
      }));

      // Refresh the portfolio data
      fetchPortfolio();
    }
  }, [tradingPortfolio, isLoadingPortfolio]);

  // Function to calculate average purchase price for a symbol
  const calculateAveragePurchasePrice = (symbol: string) => {
    const symbolTransactions = transactions.filter(t => t.symbol === symbol);
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

  if (isLoading) {
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
          <Button variant="outline" size="sm" onClick={() => {
            updateStockPrices();
            fetchPortfolio();
          }}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button size="sm" onClick={() => setIsAddingHolding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${portfolioSummary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
            <div className="text-3xl font-bold">{holdings.length}</div>
            <div className="flex items-center mt-1 text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-sm">{transactions.length} transactions recorded</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAddingHolding && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Holding</CardTitle>
            <CardDescription>Enter the details of the stock or investment you want to add</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Input name="symbol" value={newHolding.symbol} onChange={handleInputChange} placeholder="e.g., AAPL" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Name</label>
                <Input name="company_name" value={newHolding.company_name} onChange={handleInputChange} placeholder="e.g., Apple Inc." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shares</label>
                <Input type="number" name="shares" value={newHolding.shares || ''} onChange={handleInputChange} placeholder="Number of shares" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Price</label>
                <Input type="number" name="purchase_price" value={newHolding.purchase_price || ''} onChange={handleInputChange} placeholder="Price per share" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsAddingHolding(false)}>Cancel</Button>
            <Button onClick={handleAddHolding}>Add Holding</Button>
          </CardFooter>
        </Card>
      )}

      {isAddingTransaction && (
        <Card>
          <CardHeader>
            <CardTitle>Record {newTransaction.transaction_type === 'buy' ? 'Buy' : 'Sell'} Transaction</CardTitle>
            <CardDescription>Enter the details of your {newTransaction.transaction_type === 'buy' ? 'purchase' : 'sale'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Symbol</label>
                <Input name="symbol" value={newTransaction.symbol} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Transaction Type</label>
                <select 
                  name="transaction_type" 
                  value={newTransaction.transaction_type} 
                  onChange={handleTransactionInputChange as any}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Shares</label>
                <Input type="number" name="shares" value={newTransaction.shares || ''} onChange={handleTransactionInputChange} placeholder="Number of shares" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input type="number" name="price" value={newTransaction.price || ''} onChange={handleTransactionInputChange} placeholder="Price per share" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setIsAddingTransaction(false)}>Cancel</Button>
            <Button onClick={handleAddTransaction}>Record Transaction</Button>
          </CardFooter>
        </Card>
      )}

      <Tabs defaultValue="holdings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="holdings">Your Holdings</TabsTrigger>
          <TabsTrigger value="allocation">Asset Allocation</TabsTrigger>
          <TabsTrigger value="transactions">Transaction History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings" className="space-y-4">
          {holdings.length > 0 ? (
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
                  {holdings.map((holding) => {
                    const position = tradingPortfolio?.positions.find(p => p.symbol === holding.symbol);
                    const currentPrice = position ? position.market_value / position.quantity : 0;
                    const { profit, profitPercentage } = calculatePositionProfitLoss(holding);
                    
                    return (
                      <TableRow key={holding.id}>
                        {editingHoldingId === holding.id ? (
                          <>
                            <TableCell>
                              <div className="space-y-1">
                                <Input name="symbol" value={editFormData.symbol || ''} onChange={handleEditInputChange} />
                                <Input name="company_name" value={editFormData.company_name || ''} onChange={handleEditInputChange} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input name="shares" type="number" value={editFormData.shares || ''} onChange={handleEditInputChange} />
                            </TableCell>
                            <TableCell>
                              <Input name="purchase_price" type="number" value={editFormData.purchase_price || ''} onChange={handleEditInputChange} />
                            </TableCell>
                            <TableCell>
                              <Input name="current_price" type="number" value={editFormData.current_price || ''} onChange={handleEditInputChange} />
                            </TableCell>
                            <TableCell colSpan={2}></TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={saveEditing}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEditing}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>
                              <div className="font-medium">{holding.symbol}</div>
                              <div className="text-xs text-muted-foreground">{holding.company_name}</div>
                            </TableCell>
                            <TableCell>{holding.shares}</TableCell>
                            <TableCell>${(position?.cost_basis / position?.quantity || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                ${currentPrice.toFixed(2)}
                                {profit !== 0 && (
                                  <Badge variant={profit >= 0 ? "default" : "destructive"} className="text-xs">
                                    {profit >= 0 ? "↑" : "↓"}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>${position?.market_value.toFixed(2) || 0}</TableCell>
                            <TableCell className={profit >= 0 ? "text-green-500" : "text-red-500"}>
                              <div>
                                {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
                              </div>
                              <div className="text-xs">
                                {profitPercentage >= 0 ? "+" : ""}
                                {profitPercentage.toFixed(2)}%
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => startEditing(holding)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => prepareTransaction(holding, 'buy')}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => prepareTransaction(holding, 'sell')}>
                                  <TrendingDown className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-500" onClick={() => deleteHolding(holding.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <CardContent>
                <p className="text-muted-foreground mb-4">You don't have any holdings yet.</p>
                <Button onClick={() => setIsAddingHolding(true)}>
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
                  {transactions.map((transaction) => {
                    const total = transaction.shares * transaction.price;
                    const date = new Date(transaction.transaction_date);
                    
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{date.toLocaleDateString()}</TableCell>
                        <TableCell>{transaction.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'destructive'}>
                            {transaction.transaction_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.shares}</TableCell>
                        <TableCell>${transaction.price.toFixed(2)}</TableCell>
                        <TableCell>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    );
                  })}
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
