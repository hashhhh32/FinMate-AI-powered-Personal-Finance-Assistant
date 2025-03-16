
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const investmentData = [
  { month: "Jan", stocks: 4000, bonds: 2400, crypto: 1800 },
  { month: "Feb", stocks: 4200, bonds: 2500, crypto: 2100 },
  { month: "Mar", stocks: 4500, bonds: 2600, crypto: 1900 },
  { month: "Apr", stocks: 4800, bonds: 2700, crypto: 2300 },
  { month: "May", stocks: 5000, bonds: 2800, crypto: 2500 },
  { month: "Jun", stocks: 4900, bonds: 2900, crypto: 2200 },
];

const portfolioData = [
  { name: "Stocks", value: 60 },
  { name: "Bonds", value: 25 },
  { name: "Crypto", value: 10 },
  { name: "Cash", value: 5 },
];

const DashboardInvestments = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Investments</h2>
      </div>
      
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="allocation">Allocation</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$34,567.89</div>
                <p className="text-xs text-muted-foreground">+$2,345.67 (7.3%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stocks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$20,740.73</div>
                <p className="text-xs text-muted-foreground">+$1,845.67 (9.8%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bonds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$8,641.97</div>
                <p className="text-xs text-muted-foreground">+$245.67 (2.9%)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cryptocurrency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$3,456.79</div>
                <p className="text-xs text-muted-foreground">+$254.33 (7.9%)</p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Investment Performance</CardTitle>
              <CardDescription>Monthly performance across investment types</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={investmentData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="stocks" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="bonds" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="crypto" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analysis</CardTitle>
              <CardDescription>Detailed performance metrics for your investments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Your investments have grown by 13.8% year-to-date, outperforming the market benchmark by 2.4%.</p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Performers</h4>
                  <ul className="space-y-2">
                    <li className="text-sm">AAPL: +24.5%</li>
                    <li className="text-sm">MSFT: +18.2%</li>
                    <li className="text-sm">GOOGL: +15.7%</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Underperformers</h4>
                  <ul className="space-y-2">
                    <li className="text-sm">NFLX: -5.2%</li>
                    <li className="text-sm">INTC: -3.8%</li>
                    <li className="text-sm">DIS: -1.2%</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="allocation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>Current distribution of your investment portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-4">Current Allocation</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Stocks</span>
                      <span className="text-sm font-medium">60%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Bonds</span>
                      <span className="text-sm font-medium">25%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Crypto</span>
                      <span className="text-sm font-medium">10%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Cash</span>
                      <span className="text-sm font-medium">5%</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-4">Target Allocation</h4>
                  <ul className="space-y-2">
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Stocks</span>
                      <span className="text-sm font-medium">55%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Bonds</span>
                      <span className="text-sm font-medium">30%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Crypto</span>
                      <span className="text-sm font-medium">10%</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-sm">Cash</span>
                      <span className="text-sm font-medium">5%</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardInvestments;
