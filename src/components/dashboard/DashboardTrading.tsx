
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TradingAssistant from "@/components/trading/TradingAssistant";
import { useTrading } from "@/hooks/use-trading";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, BadgePercent } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

const DashboardTrading = () => {
  const { portfolio, recentOrders, isLoadingPortfolio } = useTrading();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Trading</h2>
          <p className="text-muted-foreground">
            Execute trades, monitor your portfolio, and get market insights
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Account Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPortfolio ? (
              <div className="h-20 flex items-center justify-center">
                <p className="text-muted-foreground">Loading portfolio data...</p>
              </div>
            ) : portfolio ? (
              <div className="space-y-2">
                <div className="text-3xl font-bold">${portfolio.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="flex items-center text-muted-foreground">
                  <DollarSign className="h-4 w-4 mr-1" />
                  <span className="text-sm">Available Cash: ${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Updated {portfolio.updated_at ? format(new Date(portfolio.updated_at), 'MMM d, h:mm a') : 'N/A'}
                </div>
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center">
                <p className="text-muted-foreground">No portfolio data available</p>
                <p className="text-xs text-muted-foreground mt-1">Try asking the assistant to show your portfolio</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPortfolio ? (
              <div className="h-20 flex items-center justify-center">
                <p className="text-muted-foreground">Loading holdings data...</p>
              </div>
            ) : portfolio && portfolio.positions.length > 0 ? (
              <div className="space-y-2">
                <div className="text-3xl font-bold">{portfolio.positions.length}</div>
                <div className="flex items-center text-muted-foreground">
                  <BadgePercent className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    {calculateDiversification(portfolio.positions)}% portfolio diversification
                  </span>
                </div>
                <Progress value={calculateDiversification(portfolio.positions)} className="h-2" />
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center">
                <p className="text-muted-foreground">No holdings yet</p>
                <p className="text-xs text-muted-foreground mt-1">Try asking the assistant to buy some stocks</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length > 0 ? (
              <div className="space-y-2">
                <div className="text-3xl font-bold">{recentOrders.length}</div>
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-sm">
                    Last order: {format(new Date(recentOrders[0].created_at), 'MMM d, h:mm a')}
                  </span>
                </div>
                <Badge variant={recentOrders[0].status === 'filled' ? 'default' : 'outline'}>
                  {recentOrders[0].status}
                </Badge>
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center">
                <p className="text-muted-foreground">No recent trades</p>
                <p className="text-xs text-muted-foreground mt-1">Try asking the assistant to execute a trade</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="assistant" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assistant">Trading Assistant</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-3">
              <TradingAssistant />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trading Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                      Voice Commands
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Try using voice for faster trading. Click the microphone button and say commands like "Buy 5 shares of Apple" or "What's the current price of Tesla?"
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                      Portfolio Management
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Ask the assistant to "Show my portfolio" anytime to see your current holdings and performance.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2 text-orange-500" />
                      Market Analysis
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Get insights by asking questions like "How is the market doing today?" or "What's the outlook for tech stocks?"
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Example Commands</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge className="mr-2 mb-2 cursor-pointer" variant="outline" onClick={() => {
                    const assistantInput = document.querySelector('input[placeholder="Ask a question or give a trading command..."]') as HTMLInputElement;
                    if (assistantInput) {
                      assistantInput.value = "Buy 5 shares of AAPL";
                      assistantInput.focus();
                    }
                  }}>
                    Buy 5 shares of AAPL
                  </Badge>
                  <Badge className="mr-2 mb-2 cursor-pointer" variant="outline" onClick={() => {
                    const assistantInput = document.querySelector('input[placeholder="Ask a question or give a trading command..."]') as HTMLInputElement;
                    if (assistantInput) {
                      assistantInput.value = "What's the price of MSFT?";
                      assistantInput.focus();
                    }
                  }}>
                    What's the price of MSFT?
                  </Badge>
                  <Badge className="mr-2 mb-2 cursor-pointer" variant="outline" onClick={() => {
                    const assistantInput = document.querySelector('input[placeholder="Ask a question or give a trading command..."]') as HTMLInputElement;
                    if (assistantInput) {
                      assistantInput.value = "Show my portfolio";
                      assistantInput.focus();
                    }
                  }}>
                    Show my portfolio
                  </Badge>
                  <Badge className="mr-2 mb-2 cursor-pointer" variant="outline" onClick={() => {
                    const assistantInput = document.querySelector('input[placeholder="Ask a question or give a trading command..."]') as HTMLInputElement;
                    if (assistantInput) {
                      assistantInput.value = "Sell 3 shares of TSLA";
                      assistantInput.focus();
                    }
                  }}>
                    Sell 3 shares of TSLA
                  </Badge>
                  <Badge className="mr-2 mb-2 cursor-pointer" variant="outline" onClick={() => {
                    const assistantInput = document.querySelector('input[placeholder="Ask a question or give a trading command..."]') as HTMLInputElement;
                    if (assistantInput) {
                      assistantInput.value = "How is the market performing today?";
                      assistantInput.focus();
                    }
                  }}>
                    How is the market performing today?
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="portfolio">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Holdings</CardTitle>
              <CardDescription>Your current investment portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPortfolio ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading portfolio data...</p>
                </div>
              ) : portfolio && portfolio.positions.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-medium">Symbol</th>
                          <th className="text-right p-3 font-medium">Shares</th>
                          <th className="text-right p-3 font-medium">Market Value</th>
                          <th className="text-right p-3 font-medium">Cost Basis</th>
                          <th className="text-right p-3 font-medium">P/L</th>
                          <th className="text-right p-3 font-medium">% Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.positions.map((position) => (
                          <tr key={position.symbol} className="border-t">
                            <td className="p-3 font-medium">{position.symbol}</td>
                            <td className="p-3 text-right">{position.quantity}</td>
                            <td className="p-3 text-right">${position.market_value.toFixed(2)}</td>
                            <td className="p-3 text-right">${position.cost_basis.toFixed(2)}</td>
                            <td className={`p-3 text-right ${position.unrealized_pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {position.unrealized_pl >= 0 ? '+' : ''}${position.unrealized_pl.toFixed(2)}
                            </td>
                            <td className={`p-3 text-right ${position.unrealized_plpc >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              <div className="flex items-center justify-end">
                                {position.unrealized_plpc >= 0 ? (
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 mr-1" />
                                )}
                                {position.unrealized_plpc >= 0 ? '+' : ''}
                                {position.unrealized_plpc.toFixed(2)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground">No portfolio holdings</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the Trading Assistant to buy some stocks and build your portfolio
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>Your recent trading activity</CardDescription>
            </CardHeader>
            <CardContent>
              {recentOrders.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left p-3 font-medium">Date & Time</th>
                          <th className="text-left p-3 font-medium">Order ID</th>
                          <th className="text-left p-3 font-medium">Symbol</th>
                          <th className="text-center p-3 font-medium">Direction</th>
                          <th className="text-right p-3 font-medium">Quantity</th>
                          <th className="text-right p-3 font-medium">Price</th>
                          <th className="text-center p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-t">
                            <td className="p-3 text-sm">
                              {format(new Date(order.created_at), 'MMM d, yyyy')}
                              <br />
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(order.created_at), 'h:mm:ss a')}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-xs text-muted-foreground">{order.order_id.slice(0, 8)}...</span>
                            </td>
                            <td className="p-3 font-medium">{order.symbol}</td>
                            <td className="p-3 text-center">
                              <Badge variant={order.order_type === 'buy' ? 'default' : 'destructive'}>
                                {order.order_type.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="p-3 text-right">{order.quantity}</td>
                            <td className="p-3 text-right">
                              {order.price ? `$${order.price.toFixed(2)}` : 'Market'}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline">
                                {order.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex flex-col items-center justify-center">
                  <p className="text-muted-foreground">No order history</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use the Trading Assistant to place your first trade
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper function to calculate portfolio diversification (0-100%)
function calculateDiversification(positions: any[]): number {
  if (!positions || positions.length === 0) return 0;
  
  // Calculate total portfolio value
  const totalValue = positions.reduce((sum, pos) => sum + pos.market_value, 0);
  
  // Calculate Herfindahl-Hirschman Index (HHI) - measure of concentration
  const hhi = positions.reduce((sum, pos) => {
    const weight = pos.market_value / totalValue;
    return sum + weight * weight;
  }, 0);
  
  // Convert HHI to a diversification score (0-100%)
  // When completely concentrated (1 stock), HHI = 1, so diversification = 0%
  // When perfectly diversified with n equal positions, HHI = 1/n
  const diversification = Math.min(100, Math.max(0, (1 - hhi) * 100));
  
  return Math.round(diversification);
}

export default DashboardTrading;
