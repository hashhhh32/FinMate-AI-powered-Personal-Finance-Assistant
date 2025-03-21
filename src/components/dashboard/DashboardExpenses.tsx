import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, LineChart, ArrowUpRight, ArrowDownRight, Plus, Lightbulb, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useExpenses } from "@/hooks/use-expenses";
import { useBudgetAlerts } from "@/hooks/use-budget-alerts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  created_at: string;
}

interface Budget {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  month: string;
  created_at: string;
  updated_at: string;
}

const DashboardExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [alertDialog, setAlertDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0]
  });
  const [newAlert, setNewAlert] = useState({
    category: "",
    limit_amount: "",
    period: "monthly"
  });

  const { 
    categories, 
    monthlyExpenses, 
    insights,
    addExpense,
    updateExpense,
    deleteExpense
  } = useExpenses();

  const {
    budgetAlerts,
    isLoading: alertsLoading,
    addBudgetAlert,
    deleteBudgetAlert
  } = useBudgetAlerts();

  const fetchExpenses = async () => {
    if (!user) return;
    
    try {
      setIsLoadingExpenses(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const fetchBudgets = async () => {
    if (!user) return;
    
    try {
      setIsLoadingBudgets(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', currentMonth);

      if (error) throw error;
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast.error('Failed to load budgets');
    } finally {
      setIsLoadingBudgets(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !newExpense.amount || !newExpense.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: Number(newExpense.amount),
          category: newExpense.category,
          description: newExpense.description || null,
          date: newExpense.date,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Expense added successfully');
      setExpenseDialog(false);
      fetchExpenses();
      
      // Reset form
      setNewExpense({
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAlert.category || !newAlert.limit_amount || !newAlert.period) return;
    
    await addBudgetAlert({
      category: newAlert.category,
      limit_amount: Number(newAlert.limit_amount),
      period: newAlert.period
    });
    
    setNewAlert({
      category: "",
      limit_amount: "",
      period: "monthly"
    });
    
    setAlertDialog(false);
  };

  const getCategoryColor = (category: string) => {
    const found = categories.find(c => c.name === category);
    return found ? found.color : "#999999";
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
      fetchBudgets();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const expensesSubscription = supabase
      .channel('expenses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchExpenses();
        }
      )
      .subscribe();

    return () => {
      expensesSubscription.unsubscribe();
    };
  }, [user]);

  const calculateBudgetProgress = (category: string) => {
    const budget = budgets.find(b => b.category === category);
    const categoryExpenses = expenses.filter(e => e.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0);
    
    return {
      spent: categoryExpenses,
      total: budget?.amount || 0,
      percentage: budget?.amount ? (categoryExpenses / budget.amount) * 100 : 0
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Expense Tracking</h2>
          <p className="text-muted-foreground">
            AI-powered analysis of your spending patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">Set Budget Alert</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAlertSubmit}>
                <DialogHeader>
                  <DialogTitle>Create Budget Alert</DialogTitle>
                  <DialogDescription>
                    Get notified when you exceed your budget limit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="alert-category">Category</Label>
                    <Select 
                      value={newAlert.category} 
                      onValueChange={(value) => setNewAlert({...newAlert, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Bills">Bills</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Housing">Housing</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="alert-limit">Limit Amount</Label>
                    <Input
                      id="alert-limit"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAlert.limit_amount}
                      onChange={(e) => setNewAlert({...newAlert, limit_amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="alert-period">Period</Label>
                    <Select 
                      value={newAlert.period} 
                      onValueChange={(value) => setNewAlert({...newAlert, period: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Alert</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          
          <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
            <DialogTrigger asChild>
              <Button>Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleExpenseSubmit}>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Enter the details of your new expense.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select 
                      value={newExpense.category} 
                      onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Food">Food</SelectItem>
                        <SelectItem value="Bills">Bills</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Entertainment">Entertainment</SelectItem>
                        <SelectItem value="Shopping">Shopping</SelectItem>
                        <SelectItem value="Housing">Housing</SelectItem>
                        <SelectItem value="Transportation">Transportation</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      placeholder="e.g., Groceries at Walmart"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Expense</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="alerts">Budget Alerts</TabsTrigger>
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
                  {monthlyExpenses.length > 0 ? (
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
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
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
                  {categories.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={categories}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {categories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip formatter={(value) => [`$${value}`, "Amount"]} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground">No data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  Smart analysis of your spending patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  {insights.map((insight, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="h-8 w-8 flex items-center justify-center rounded-full" style={{ backgroundColor: getCategoryColor(insight.category) }}>
                        <Lightbulb className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {budgetAlerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Active Budget Alerts
                </CardTitle>
                <CardDescription>
                  Get notified when you exceed your spending limits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  {budgetAlerts.slice(0, 3).map((alert) => (
                    <div key={alert.id} className="flex gap-4 items-start">
                      <div className="h-8 w-8 flex items-center justify-center rounded-full" style={{ backgroundColor: getCategoryColor(alert.category) }}>
                        <AlertTriangle className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{alert.category}</h4>
                        <p className="text-sm text-muted-foreground">
                          Limit: ${Number(alert.limit_amount).toFixed(2)} {alert.period}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {budgetAlerts.length > 3 && (
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    And {budgetAlerts.length - 3} more alerts. View all in the Budget Alerts tab.
                  </p>
                </CardFooter>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {categories.length > 0 ? (
              categories.map((category) => (
                <Card key={category.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-medium">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${category.value.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">
                      {Math.floor((category.value / categories.reduce((sum, cat) => sum + cat.value, 0)) * 100)}% of total expenses
                    </p>
                    <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.floor((category.value / categories.reduce((sum, cat) => sum + cat.value, 0)) * 100)}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 flex justify-center p-8">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">No expense data available</p>
                  <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Expense
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>
                A list of your recent expenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingExpenses ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading expenses...
                        </TableCell>
                      </TableRow>
                    ) : expenses.length > 0 ? (
                      expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            {expense.description || expense.category}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getCategoryColor(expense.category) }}
                              />
                              {expense.category}
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(expense.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-medium text-red-600 flex items-center justify-end">
                              <ArrowDownRight className="h-4 w-4 mr-1" />
                              ${Number(expense.amount).toFixed(2)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="text-muted-foreground mb-4">No transactions found</div>
                          <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Your First Expense
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {insights.length > 0 ? (
              insights.map((insight, index) => (
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
              ))
            ) : (
              <div className="col-span-3 flex justify-center p-8">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    No insights available yet. Add more expense data to generate personalized insights.
                  </p>
                  <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add More Expenses
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Budget Alerts</CardTitle>
                <CardDescription>
                  Get notified when you exceed your spending limits
                </CardDescription>
              </div>
              <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Alert
                  </Button>
                </DialogTrigger>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Limit</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertsLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : budgetAlerts.length > 0 ? (
                      budgetAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getCategoryColor(alert.category) }}
                              />
                              {alert.category}
                            </div>
                          </TableCell>
                          <TableCell>
                            ${Number(alert.limit_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="capitalize">
                            {alert.period}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => deleteBudgetAlert(alert.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8">
                          <div className="text-muted-foreground mb-4">No budget alerts found</div>
                          <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Your First Alert
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardExpenses;
