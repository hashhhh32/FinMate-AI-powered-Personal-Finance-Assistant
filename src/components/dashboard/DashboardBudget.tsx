
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CircleDollarSign, Home, ShoppingCart, Car, Utensils, Monitor, Ticket } from "lucide-react";

// Mock budget data
const budgetData = [
  {
    category: "Housing",
    spent: 1200,
    budget: 1300,
    icon: <Home className="h-4 w-4" />,
    color: "#0ea5e9",
  },
  {
    category: "Groceries",
    spent: 420,
    budget: 500,
    icon: <ShoppingCart className="h-4 w-4" />,
    color: "#10b981",
  },
  {
    category: "Transportation",
    spent: 380,
    budget: 350,
    icon: <Car className="h-4 w-4" />,
    color: "#f97316",
  },
  {
    category: "Dining Out",
    spent: 280,
    budget: 300,
    icon: <Utensils className="h-4 w-4" />,
    color: "#8b5cf6",
  },
  {
    category: "Entertainment",
    spent: 150,
    budget: 200,
    icon: <Ticket className="h-4 w-4" />,
    color: "#ec4899",
  },
  {
    category: "Utilities",
    spent: 220,
    budget: 250,
    icon: <Monitor className="h-4 w-4" />,
    color: "#f59e0b",
  },
];

// Prepare data for pie chart
const pieChartData = budgetData.map((item) => ({
  name: item.category,
  value: item.spent,
  color: item.color,
}));

const DashboardBudget = () => {
  // Calculate total budget and spent
  const totalBudget = budgetData.reduce((acc, item) => acc + item.budget, 0);
  const totalSpent = budgetData.reduce((acc, item) => acc + item.spent, 0);
  const percentSpent = Math.round((totalSpent / totalBudget) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
        <Button>Adjust Budget</Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">For this month</p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent So Far</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSpent.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalSpent <= totalBudget 
                ? `${(totalBudget - totalSpent).toFixed(2)} remaining` 
                : `${(totalSpent - totalBudget).toFixed(2)} over budget`}
            </p>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Progress</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                {percentSpent}% of total budget used
              </span>
              <span className="text-sm font-medium">
                ${totalSpent.toFixed(2)} / ${totalBudget.toFixed(2)}
              </span>
            </div>
            <Progress value={percentSpent} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {Math.round((new Date().getDate() / 30) * 100)}% through the month
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle>Budget Breakdown</CardTitle>
            <CardDescription>
              Track your spending against your budget for each category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {budgetData.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}20` }}>
                        {React.cloneElement(item.icon, { style: { color: item.color } })}
                      </div>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="text-sm">
                      ${item.spent.toFixed(2)} / ${item.budget.toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(item.spent / item.budget) * 100} 
                      className="h-2"
                      style={{ 
                        backgroundColor: `${item.color}20`,
                        '--progress-color': item.color 
                      } as React.CSSProperties}
                    />
                    <span className="text-sm text-muted-foreground min-w-[40px] text-right">
                      {Math.round((item.spent / item.budget) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
            <CardDescription>
              Breakdown of your spending by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, "Spent"]} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>AI Budget Recommendations</CardTitle>
          <CardDescription>
            Personalized suggestions to help you manage your finances better
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-finmate-50 dark:bg-finmate-900/20 rounded-lg">
            <h3 className="font-medium mb-2 text-finmate-700 dark:text-finmate-500">Transportation Spending Alert</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You've spent more than your transportation budget this month. Consider using public transit or carpooling to reduce costs.
            </p>
          </div>
          <div className="p-4 bg-accent-50 dark:bg-accent-900/20 rounded-lg">
            <h3 className="font-medium mb-2 text-accent-700 dark:text-accent-500">Dining Out Optimization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You're on track with your dining out budget. Based on your spending patterns, we recommend allocating 5% more to groceries next month to further optimize your food expenses.
            </p>
          </div>
          <div className="p-4 bg-finmate-50 dark:bg-finmate-900/20 rounded-lg">
            <h3 className="font-medium mb-2 text-finmate-700 dark:text-finmate-500">Savings Opportunity</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You have approximately $380 in potential savings across all categories this month. Consider transferring this amount to your emergency fund or investment account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardBudget;
