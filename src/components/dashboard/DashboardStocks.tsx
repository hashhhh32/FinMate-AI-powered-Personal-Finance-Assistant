
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, BarChart, Search } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";
import { useStockPredictions } from "@/hooks/use-stock-predictions";

const stockInfo = {
  "AAPL": { name: "Apple Inc.", risk: "Low" },
  "MSFT": { name: "Microsoft Corp.", risk: "Low" },
  "AMZN": { name: "Amazon.com Inc.", risk: "Medium" },
  "TSLA": { name: "Tesla Inc.", risk: "High" },
  "NVDA": { name: "NVIDIA Corp.", risk: "Medium" },
};

const marketNews = [
  {
    title: "Fed signals potential rate cuts later this year",
    source: "Market Watch",
    time: "2 hours ago",
  },
  {
    title: "Tech stocks rally on strong earnings reports",
    source: "Bloomberg",
    time: "4 hours ago",
  },
  {
    title: "AI chip demand drives semiconductor sector growth",
    source: "Reuters",
    time: "6 hours ago",
  },
];

const DashboardStocks = () => {
  const {
    historicalData,
    realtimePrices,
    predictedPrices,
    watchlist,
    isLoading,
    simulateRealtimeUpdates,
    generatePredictions
  } = useStockPredictions();

  const [searchQuery, setSearchQuery] = useState("");

  // Prepare stock data for display
  const stockData = watchlist.map(symbol => {
    const currentPrice = realtimePrices[symbol]?.price || 0;
    const previousClose = historicalData[symbol]?.length > 0 
      ? historicalData[symbol][historicalData[symbol].length - 1].close 
      : currentPrice;
    
    // Calculate price change percentage
    const change = currentPrice > 0 && previousClose > 0
      ? Number(((currentPrice - previousClose) / previousClose * 100).toFixed(2))
      : 0;
    
    // Determine prediction based on available data
    const latestPrediction = predictedPrices[symbol]?.length > 0
      ? predictedPrices[symbol][predictedPrices[symbol].length - 1].predicted_price
      : null;
    
    const predictionChange = latestPrediction && currentPrice
      ? Number(((latestPrediction - currentPrice) / currentPrice * 100).toFixed(2))
      : 0;
    
    const predictionDirection = predictionChange > 3 
      ? "Strong Buy" 
      : predictionChange > 1 
        ? "Buy" 
        : predictionChange < -3 
          ? "Sell" 
          : predictionChange < -1 
            ? "Weak Sell" 
            : "Hold";
    
    // Calculate confidence based on prediction consistency
    const confidence = predictedPrices[symbol]?.length > 1
      ? Math.min(95, 60 + Math.abs(predictionChange) * 2)
      : Math.floor(65 + Math.random() * 20);
    
    return {
      symbol,
      name: stockInfo[symbol as keyof typeof stockInfo]?.name || `${symbol} Stock`,
      price: currentPrice,
      change,
      prediction: predictionDirection,
      risk: stockInfo[symbol as keyof typeof stockInfo]?.risk || "Medium",
      confidence,
    };
  }).filter(stock => 
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Prepare chart data
  const combinedChartData = watchlist.reduce((acc: Record<string, any>[], symbol: string) => {
    const stockHistory = historicalData[symbol] || [];
    
    if (stockHistory.length === 0) return acc;
    
    // Get the last 7 data points or whatever is available
    const recentHistory = stockHistory.slice(-7);
    
    // Format dates for the chart
    recentHistory.forEach((dataPoint, i) => {
      const date = new Date(dataPoint.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (i >= acc.length) {
        acc.push({ date });
      }
      
      acc[i][symbol] = dataPoint.close;
    });
    
    // Add predictions for future dates if available
    const predictions = predictedPrices[symbol] || [];
    if (predictions.length > 0) {
      const futurePredictions = predictions.slice(-3); // Get the last 3 predictions
      
      futurePredictions.forEach((prediction, i) => {
        const date = new Date(prediction.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const chartIndex = recentHistory.length + i;
        
        if (chartIndex >= acc.length) {
          acc.push({ date });
        }
        
        acc[chartIndex][`${symbol}_pred`] = prediction.predicted_price;
      });
    }
    
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Market Predictions</h2>
          <p className="text-muted-foreground">
            AI-driven stock predictions and market insights
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={simulateRealtimeUpdates} variant="outline" size="sm" className="hidden md:flex">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Prices
          </Button>
          <Button onClick={generatePredictions} variant="default" size="sm">
            <BarChart className="h-4 w-4 mr-2" />
            Generate Predictions
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search stocks by symbol or name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 mb-4"
        />
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="news">Market News</TabsTrigger>
        </TabsList>
        
        <TabsContent value="predictions" className="space-y-4">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-2">
                    <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {stockData.map((stock) => (
                <Card key={stock.symbol}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{stock.symbol}</CardTitle>
                        <CardDescription>{stock.name}</CardDescription>
                      </div>
                      {stock.change > 0 ? (
                        <div className="flex items-center text-green-500">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          <span>+{stock.change}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-500">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          <span>{stock.change}%</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${stock.price.toFixed(2)}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">AI Prediction:</span>
                        <span className={`font-medium ${
                          stock.prediction.includes("Buy") ? "text-green-500" : 
                          stock.prediction === "Hold" ? "text-yellow-500" : "text-red-500"
                        }`}>{stock.prediction}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Risk Level:</span>
                        <span className={`font-medium ${
                          stock.risk === "Low" ? "text-green-500" : 
                          stock.risk === "Medium" ? "text-yellow-500" : "text-red-500"
                        }`}>{stock.risk}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Confidence:</span>
                        <span className="font-medium">{stock.confidence}%</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stock.confidence > 85 ? "bg-green-500" : 
                          stock.confidence > 70 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${stock.confidence}%` }}
                      />
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Price History & Predictions</CardTitle>
              <CardDescription>
                Historical performance and AI predictions for selected stocks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={combinedChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      {watchlist.map((symbol, index) => (
                        <React.Fragment key={symbol}>
                          <linearGradient id={`color${symbol}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={
                              symbol === 'AAPL' ? '#8884d8' : 
                              symbol === 'MSFT' ? '#82ca9d' : 
                              symbol === 'NVDA' ? '#ffc658' :
                              symbol === 'AMZN' ? '#ff8042' :
                              '#8dd1e1'
                            } stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={
                              symbol === 'AAPL' ? '#8884d8' : 
                              symbol === 'MSFT' ? '#82ca9d' : 
                              symbol === 'NVDA' ? '#ffc658' :
                              symbol === 'AMZN' ? '#ff8042' :
                              '#8dd1e1'
                            } stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id={`color${symbol}_pred`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={
                              symbol === 'AAPL' ? '#8884d8' : 
                              symbol === 'MSFT' ? '#82ca9d' : 
                              symbol === 'NVDA' ? '#ffc658' :
                              symbol === 'AMZN' ? '#ff8042' :
                              '#8dd1e1'
                            } stopOpacity={0.5}/>
                            <stop offset="95%" stopColor={
                              symbol === 'AAPL' ? '#8884d8' : 
                              symbol === 'MSFT' ? '#82ca9d' : 
                              symbol === 'NVDA' ? '#ffc658' :
                              symbol === 'AMZN' ? '#ff8042' :
                              '#8dd1e1'
                            } stopOpacity={0}/>
                          </linearGradient>
                        </React.Fragment>
                      ))}
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value) => [`$${value}`, "Price"]} />
                    <Legend />
                    {watchlist.map(symbol => (
                      <React.Fragment key={symbol}>
                        <Area 
                          type="monotone" 
                          dataKey={symbol} 
                          stroke={
                            symbol === 'AAPL' ? '#8884d8' : 
                            symbol === 'MSFT' ? '#82ca9d' : 
                            symbol === 'NVDA' ? '#ffc658' :
                            symbol === 'AMZN' ? '#ff8042' :
                            '#8dd1e1'
                          } 
                          fillOpacity={1} 
                          fill={`url(#color${symbol})`} 
                          name={`${symbol} (Actual)`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={`${symbol}_pred`} 
                          stroke={
                            symbol === 'AAPL' ? '#8884d8' : 
                            symbol === 'MSFT' ? '#82ca9d' : 
                            symbol === 'NVDA' ? '#ffc658' :
                            symbol === 'AMZN' ? '#ff8042' :
                            '#8dd1e1'
                          } 
                          strokeDasharray="5 5"
                          fillOpacity={0.2} 
                          fill={`url(#color${symbol}_pred)`} 
                          name={`${symbol} (Predicted)`}
                        />
                      </React.Fragment>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <div className="grid gap-4 grid-cols-1">
            {marketNews.map((news, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{news.title}</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardDescription>{news.source} • {news.time}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This news may impact market sentiment and stock prices in the short term. Our AI analysis suggests keeping a close watch on related sectors.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardStocks;
