
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, AlertCircle, Info } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area } from "recharts";

const stockData = [
  {
    name: "Apple Inc.",
    symbol: "AAPL",
    price: 174.82,
    change: 1.45,
    prediction: "Buy",
    risk: "Low",
    confidence: 87,
  },
  {
    name: "Microsoft Corp.",
    symbol: "MSFT",
    price: 328.79,
    change: 2.16,
    prediction: "Buy",
    risk: "Low",
    confidence: 92,
  },
  {
    name: "Amazon.com Inc.",
    symbol: "AMZN",
    price: 132.65,
    change: -0.54,
    prediction: "Hold",
    risk: "Medium",
    confidence: 75,
  },
  {
    name: "Tesla Inc.",
    symbol: "TSLA",
    price: 224.57,
    change: -1.83,
    prediction: "Sell",
    risk: "High",
    confidence: 68,
  },
  {
    name: "NVIDIA Corp.",
    symbol: "NVDA",
    price: 437.53,
    change: 3.29,
    prediction: "Strong Buy",
    risk: "Medium",
    confidence: 93,
  }
];

const historicalData = [
  { date: "Jan", AAPL: 150.80, MSFT: 310.20, NVDA: 380.50 },
  { date: "Feb", AAPL: 155.40, MSFT: 305.70, NVDA: 390.30 },
  { date: "Mar", AAPL: 162.30, MSFT: 315.90, NVDA: 410.20 },
  { date: "Apr", AAPL: 165.75, MSFT: 319.40, NVDA: 405.70 },
  { date: "May", AAPL: 168.40, MSFT: 322.60, NVDA: 415.30 },
  { date: "Jun", AAPL: 174.82, MSFT: 328.79, NVDA: 437.53 },
];

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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Market Predictions</h2>
          <p className="text-muted-foreground">
            AI-driven stock predictions and market insights
          </p>
        </div>
      </div>

      <Tabs defaultValue="predictions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="predictions">AI Predictions</TabsTrigger>
          <TabsTrigger value="market">Market Data</TabsTrigger>
          <TabsTrigger value="news">Market News</TabsTrigger>
        </TabsList>
        
        <TabsContent value="predictions" className="space-y-4">
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
                  <div className="text-2xl font-bold">${stock.price}</div>
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
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Price History</CardTitle>
              <CardDescription>
                Historical performance of selected stocks over the past 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={historicalData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAAPL" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMSFT" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNVDA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ffc658" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value) => [`$${value}`, "Price"]} />
                    <Legend />
                    <Area type="monotone" dataKey="AAPL" stroke="#8884d8" fillOpacity={1} fill="url(#colorAAPL)" />
                    <Area type="monotone" dataKey="MSFT" stroke="#82ca9d" fillOpacity={1} fill="url(#colorMSFT)" />
                    <Area type="monotone" dataKey="NVDA" stroke="#ffc658" fillOpacity={1} fill="url(#colorNVDA)" />
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
                    <Info className="h-4 w-4 text-muted-foreground" />
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
