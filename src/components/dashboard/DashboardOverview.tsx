
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Landmark, PiggyBank } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from "recharts";

// Mock data for the charts
const balanceHistory = [
  { name: "Jan", amount: 5000 },
  { name: "Feb", amount: 5600 },
  { name: "Mar", amount: 6200 },
  { name: "Apr", amount: 5800 },
  { name: "May", amount: 6500 },
  { name: "Jun", amount: 7200 },
  { name: "Jul", amount: 8000 },
];

const expensesByCategory = [
  { name: "Housing", value: 1200 },
  { name: "Food", value: 600 },
  { name: "Transportation", value: 400 },
  { name: "Utilities", value: 300 },
  { name: "Entertainment", value: 200 },
  { name: "Others", value: 150 },
];

const monthlyIncome = [
  { name: "Jan", income: 4000, expenses: 2400 },
  { name: "Feb", income: 4100, expenses: 2600 },
  { name: "Mar", income: 4200, expenses: 2800 },
  { name: "Apr", income: 4000, expenses: 2900 },
  { name: "May", income: 4500, expenses: 3100 },
  { name: "Jun", income: 4600, expenses: 3200 },
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A569BD", "#F39C12"];

const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$8,240.00</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpRight className="mr-1 h-4 w-4" />
                +20.1% from last month
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4,600.00</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpRight className="mr-1 h-4 w-4" />
                +2.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,200.00</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-500 flex items-center">
                <ArrowDownRight className="mr-1 h-4 w-4" />
                +3.1% from last month
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investments</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,580.00</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 flex items-center">
                <ArrowUpRight className="mr-1 h-4 w-4" />
                +12.5% all time
              </span>
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Balance History Chart */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Balance History</CardTitle>
          <CardDescription>
            Your account balance trend over the past 6 months
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={balanceHistory}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
              <Area type="monotone" dataKey="amount" stroke="#0284c7" fill="#0ea5e9" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expenses */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>
              Monthly comparison for the past 6 months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyIncome}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, ""]} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" />
                <Bar dataKey="expenses" name="Expenses" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Expense Breakdown */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
            <CardDescription>
              Distribution of your monthly expenses by category
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Insights */}
      <Card className="col-span-4 bg-gradient-to-r from-finmate-50 to-accent-50 border-finmate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-finmate-100 p-1 rounded">🤖</span> AI Financial Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-2 text-finmate-700">Spending Pattern Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your dining out expenses have increased by 15% compared to last month. Consider setting a budget cap for this category to maintain your savings goals.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-2 text-finmate-700">Investment Opportunity</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on your risk profile and financial goals, consider allocating 5% more of your portfolio to index funds to improve long-term returns.
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="font-medium mb-2 text-finmate-700">Bill Reminder</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your utility bill is due in 3 days. Consider setting up automatic payments to avoid late fees in the future.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
