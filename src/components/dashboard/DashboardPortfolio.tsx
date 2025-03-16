
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertCircle, Plus, RefreshCcw } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from "recharts";

const portfolioData = [
  { name: "Stocks", value: 25000, color: "#3b82f6" },
  { name: "Bonds", value: 12000, color: "#10b981" },
  { name: "Cash", value: 8000, color: "#f59e0b" },
  { name: "Real Estate", value: 35000, color: "#8b5cf6" },
  { name: "Crypto", value: 5000, color: "#ef4444" },
];

const holdings = [
  {
    name: "Apple Inc.",
    symbol: "AAPL",
    shares: 25,
    avgPrice: 145.32,
    currentPrice: 174.82,
    value: 4370.50,
    change: 20.30,
  },
  {
    name: "Microsoft Corp.",
    symbol: "MSFT",
    shares: 12,
    avgPrice: 280.45,
    currentPrice: 328.79,
    value: 3945.48,
    change: 17.24,
  },
  {
    name: "Amazon.com Inc.",
    symbol: "AMZN",
    shares: 10,
    avgPrice: 135.67,
    currentPrice: 132.65,
    value: 1326.50,
    change: -2.23,
  },
  {
    name: "Tesla Inc.",
    symbol: "TSLA",
    shares: 8,
    avgPrice: 250.34,
    currentPrice: 224.57,
    value: 1796.56,
    change: -10.29,
  },
  {
    name: "NVIDIA Corp.",
    symbol: "NVDA",
    shares: 15,
    avgPrice: 350.12,
    currentPrice: 437.53,
    value: 6562.95,
    change: 24.97,
  },
];

const recommendations = [
  {
    title: "Rebalance Portfolio",
    description: "Your portfolio is currently overweight in tech stocks. Consider diversifying into other sectors to reduce risk.",
    impact: "Medium",
  },
  {
    title: "Increase Bond Allocation",
    description: "With rising interest rates, increasing your bond allocation could provide more stability.",
    impact: "High",
  },
  {
    title: "Tax-Loss Harvesting",
    description: "Consider selling TSLA at a loss to offset capital gains taxes from your profitable positions.",
    impact: "Medium",
  },
];

const DashboardPortfolio = () => {
  const totalValue = portfolioData.reduce((sum, item) => sum + item.value, 0);
  
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
          <Button variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm">
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
            <div className="text-3xl font-bold">${totalValue.toLocaleString()}</div>
            <div className="flex items-center mt-1 text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+5.2% all time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Annual Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">+8.7%</div>
            <div className="flex items-center mt-1 text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+2.3% vs market</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Moderate</div>
            <div className="flex items-center mt-1 text-yellow-500">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">Consider diversification</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="holdings">Your Holdings</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Breakdown of your current investment portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={portfolioData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {portfolioData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holdings" className="space-y-4">
          <div className="rounded-md border">
            <div className="p-4">
              <div className="grid grid-cols-7 font-medium">
                <div>Symbol</div>
                <div>Shares</div>
                <div>Avg. Price</div>
                <div>Current Price</div>
                <div>Value</div>
                <div>Profit/Loss</div>
                <div>% Change</div>
              </div>
            </div>
            <div className="divide-y">
              {holdings.map((holding) => (
                <div key={holding.symbol} className="p-4 grid grid-cols-7 items-center">
                  <div className="font-medium">
                    {holding.symbol}
                    <div className="text-xs text-muted-foreground">{holding.name}</div>
                  </div>
                  <div>{holding.shares}</div>
                  <div>${holding.avgPrice.toFixed(2)}</div>
                  <div>${holding.currentPrice.toFixed(2)}</div>
                  <div>${holding.value.toLocaleString()}</div>
                  <div>
                    ${((holding.currentPrice - holding.avgPrice) * holding.shares).toFixed(2)}
                  </div>
                  <div className={holding.change >= 0 ? "text-green-500" : "text-red-500"}>
                    {holding.change >= 0 ? "+" : ""}{holding.change.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 grid-cols-1">
            {recommendations.map((rec, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{rec.title}</CardTitle>
                    <Badge variant={
                      rec.impact === "High" ? "destructive" : 
                      rec.impact === "Medium" ? "default" : "outline"
                    }>
                      {rec.impact} Impact
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {rec.description}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    Learn More
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPortfolio;
