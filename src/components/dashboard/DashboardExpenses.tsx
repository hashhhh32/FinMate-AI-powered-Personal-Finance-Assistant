
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, LineChart } from "lucide-react";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const expenseData = [
  { name: "Food", value: 400, color: "#FF6384" },
  { name: "Bills", value: 300, color: "#36A2EB" },
  { name: "Travel", value: 200, color: "#FFCE56" },
  { name: "Entertainment", value: 150, color: "#4BC0C0" },
  { name: "Shopping", value: 250, color: "#9966FF" },
  { name: "Other", value: 100, color: "#FF9F40" },
];

const monthlyExpenses = [
  { name: "Jan", amount: 1200 },
  { name: "Feb", amount: 1350 },
  { name: "Mar", amount: 1100 },
  { name: "Apr", amount: 980 },
  { name: "May", amount: 1450 },
  { name: "Jun", amount: 1700 },
];

const insights = [
  {
    title: "Spending Increase",
    description: "Your food expenses increased by 15% compared to last month",
    category: "Food",
  },
  {
    title: "Potential Savings",
    description: "You could save $45 by optimizing your subscription services",
    category: "Bills",
  },
  {
    title: "Unusual Activity",
    description: "Higher than usual spending on entertainment this month",
    category: "Entertainment",
  },
];

const DashboardExpenses = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expense Tracking</h2>
          <p className="text-muted-foreground">
            AI-powered analysis of your spending patterns
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Monthly Expenses</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={monthlyExpenses}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                      <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">Expense Breakdown</CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {expenseData.map((category) => (
              <Card key={category.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">{category.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${category.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(category.value / 14)}% of total expenses
                  </p>
                  <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.floor(category.value / 14)}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {insights.map((insight, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium">{insight.title}</CardTitle>
                  <CardDescription>Category: {insight.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {insight.description}
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

export default DashboardExpenses;
