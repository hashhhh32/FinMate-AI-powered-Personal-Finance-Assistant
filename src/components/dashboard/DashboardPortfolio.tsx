
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePortfolio } from "@/hooks/use-portfolio";
import { PortfolioHolding } from "@/types/expense";
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

const DashboardPortfolio = () => {
  const { 
    holdings, 
    transactions, 
    isLoading, 
    portfolioSummary, 
    assetAllocation,
    addHolding,
    updateHolding,
    deleteHolding,
    addTransaction,
    updateStockPrices
  } = usePortfolio();

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
          <Button variant="outline" size="sm" onClick={updateStockPrices}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh Prices
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
                    const currentPrice = holding.current_price || holding.purchase_price;
                    const totalValue = holding.shares * currentPrice;
                    const totalCost = holding.shares * holding.purchase_price;
                    const profit = totalValue - totalCost;
                    const profitPercentage = (profit / totalCost) * 100;
                    
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
                            <TableCell>${holding.purchase_price.toFixed(2)}</TableCell>
                            <TableCell>${currentPrice.toFixed(2)}</TableCell>
                            <TableCell>${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className={profit >= 0 ? "text-green-500" : "text-red-500"}>
                              <div>
                                {profit >= 0 ? "+" : ""}${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
