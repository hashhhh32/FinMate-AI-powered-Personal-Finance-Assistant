import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { CircleDollarSign, Home, ShoppingCart, Car, Utensils, Monitor, Ticket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AddBudgetDialog } from "./AddBudgetDialog";

// Category icons mapping
const categoryIcons: Record<string, JSX.Element> = {
  "Housing": <Home className="h-4 w-4" />,
  "Groceries": <ShoppingCart className="h-4 w-4" />,
  "Transportation": <Car className="h-4 w-4" />,
  "Dining Out": <Utensils className="h-4 w-4" />,
  "Entertainment": <Ticket className="h-4 w-4" />,
  "Utilities": <Monitor className="h-4 w-4" />,
  "Shopping": <ShoppingCart className="h-4 w-4" />,
  "Other": <CircleDollarSign className="h-4 w-4" />
};

// Category colors
const categoryColors: Record<string, string> = {
  "Housing": "#0ea5e9",
  "Groceries": "#10b981",
  "Transportation": "#f97316",
  "Dining Out": "#8b5cf6",
  "Entertainment": "#ec4899",
  "Utilities": "#f59e0b",
  "Shopping": "#6366f1",
  "Other": "#64748b"
};

const DashboardBudget = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<Record<string, number>>({});
  const [recommendations, setRecommendations] = useState<string[]>([]);

  // Fetch budgets and expenses
  const fetchBudgetData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get current month's start and end dates
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      // Fetch budgets
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('category, amount')
        .eq('user_id', user.id)
        .eq('month', now.toISOString().slice(0, 7));

      if (budgetError) throw budgetError;

      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('category, amount')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (expenseError) throw expenseError;

      // Process budget data
      const budgetMap = (budgetData || []).reduce((acc, { category, amount }) => {
        acc[category] = amount;
        return acc;
      }, {} as Record<string, number>);

      // Process expense data
      const expenseMap = (expenseData || []).reduce((acc, { category, amount }) => {
        acc[category] = (acc[category] || 0) + Math.abs(amount);
        return acc;
      }, {} as Record<string, number>);

      setBudgets(budgetMap);
      setExpenses(expenseMap);
      generateRecommendations(budgetMap, expenseMap);
    } catch (error: any) {
      console.error('Error fetching budget data:', error);
      toast.error("Failed to load budget data");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate budget recommendations
  const generateRecommendations = (budgetMap: Record<string, number>, expenseMap: Record<string, number>) => {
    const newRecommendations: string[] = [];

    // Check overspending categories
    Object.entries(expenseMap).forEach(([category, spent]) => {
      const budget = budgetMap[category] || 0;
      if (spent > budget) {
        newRecommendations.push(`You've exceeded your ${category} budget by $${(spent - budget).toFixed(2)}. Consider reducing spending in this category.`);
      }
    });

    // Check underspending categories
    Object.entries(budgetMap).forEach(([category, budget]) => {
      const spent = expenseMap[category] || 0;
      if (spent < budget * 0.5 && new Date().getDate() > 20) {
        newRecommendations.push(`You've only used ${((spent / budget) * 100).toFixed(1)}% of your ${category} budget. Consider reallocating some funds.`);
      }
    });

    setRecommendations(newRecommendations);
  };

  // Set up real-time subscription for expenses
  useEffect(() => {
    if (!user) return;

    fetchBudgetData();

    const channel = supabase
      .channel('budget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBudgetData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Calculate totals
  const totalBudget = Object.values(budgets).reduce((acc, amount) => acc + amount, 0);
  const totalSpent = Object.values(expenses).reduce((acc, amount) => acc + amount, 0);
  const percentSpent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Prepare data for pie chart
  const pieChartData = Object.entries(expenses).map(([category, spent]) => ({
    name: category,
    value: spent,
    color: categoryColors[category] || categoryColors.Other
  }));

  // Prepare data for budget breakdown
  const budgetBreakdown = Object.entries(budgets).map(([category, budget]) => ({
    category,
    spent: expenses[category] || 0,
    budget,
    icon: categoryIcons[category] || categoryIcons.Other,
    color: categoryColors[category] || categoryColors.Other
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Budget</h2>
        <AddBudgetDialog onBudgetUpdated={fetchBudgetData} currentBudgets={budgets} />
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
                ? `$${(totalBudget - totalSpent).toFixed(2)} remaining` 
                : `$${(totalSpent - totalBudget).toFixed(2)} over budget`}
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
              {Math.round((new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}% through the month
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
            {isLoading ? (
              <div className="text-center py-4">Loading budget data...</div>
            ) : budgetBreakdown.length === 0 ? (
              <div className="text-center py-4">No budget data available. Click "Adjust Budget" to set up your budgets.</div>
            ) : (
              <div className="space-y-6">
                {budgetBreakdown.map((item) => (
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
            )}
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
            {isLoading ? (
              <div className="text-center py-4">Loading spending data...</div>
            ) : pieChartData.length === 0 ? (
              <div className="text-center py-4">No spending data available for this month.</div>
            ) : (
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
                    <Tooltip formatter={(value) => [`$${(value as number).toFixed(2)}`, "Spent"]} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
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
          {recommendations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No recommendations available at this time.
            </div>
          ) : (
            recommendations.map((recommendation, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg ${
                  index % 2 === 0 
                    ? "bg-finmate-50 dark:bg-finmate-900/20" 
                    : "bg-accent-50 dark:bg-accent-900/20"
                }`}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {recommendation}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardBudget;
