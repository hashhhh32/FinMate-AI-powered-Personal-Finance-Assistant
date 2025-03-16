
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Expense, ExpenseCategory, MonthlyExpense, ExpenseInsight } from "@/types/expense";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [insights, setInsights] = useState<ExpenseInsight[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const categoryColors = {
    "Food": "#FF6384",
    "Bills": "#36A2EB",
    "Travel": "#FFCE56",
    "Entertainment": "#4BC0C0",
    "Shopping": "#9966FF",
    "Other": "#FF9F40",
    "Housing": "#41B883",
    "Transportation": "#E46651",
    "Healthcare": "#00D8FF",
    "Education": "#DD1B16"
  };

  useEffect(() => {
    if (!user) return;
    
    // Fetch expenses
    fetchExpenses();

    // Set up real-time subscription
    const channel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setExpenses((prev) => [payload.new as Expense, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setExpenses((prev) => 
              prev.map((expense) => 
                expense.id === payload.new.id ? payload.new as Expense : expense
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setExpenses((prev) => 
              prev.filter((expense) => expense.id !== payload.old.id)
            );
          }
          
          // Recalculate insights whenever expenses change
          calculateInsights();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (expenses.length > 0) {
      processExpenseData();
      calculateInsights();
    }
  }, [expenses]);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      setExpenses(data || []);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error fetching expenses",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const addExpense = async (newExpense: Omit<Expense, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([
          { 
            ...newExpense,
            user_id: user?.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Expense added",
        description: "Your expense has been successfully added"
      });
      
      // No need to update state manually as the realtime subscription will handle it
      return data[0];
    } catch (error: any) {
      toast({
        title: "Error adding expense",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateExpense = async (id: string, updatedExpense: Partial<Expense>) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update(updatedExpense)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Expense updated",
        description: "Your expense has been successfully updated"
      });
      
      // No need to update state manually as the realtime subscription will handle it
    } catch (error: any) {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Expense deleted",
        description: "Your expense has been successfully deleted"
      });
      
      // No need to update state manually as the realtime subscription will handle it
    } catch (error: any) {
      toast({
        title: "Error deleting expense",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const processExpenseData = () => {
    // Calculate categories
    const categoryMap = new Map<string, number>();
    
    expenses.forEach((expense) => {
      const currentAmount = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, currentAmount + Number(expense.amount));
    });
    
    const processedCategories: ExpenseCategory[] = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
      color: categoryColors[name as keyof typeof categoryColors] || "#999999"
    }));
    
    setCategories(processedCategories);

    // Calculate monthly expenses (last 6 months)
    const monthMap = new Map<string, number>();
    const now = new Date();
    
    // Initialize last 6 months with 0 values
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = month.toLocaleString('default', { month: 'short' });
      monthMap.set(monthName, 0);
    }
    
    // Fill with actual values
    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.date);
      const monthName = expenseDate.toLocaleString('default', { month: 'short' });
      
      // Only include expenses from the last 6 months
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      if (expenseDate >= sixMonthsAgo) {
        const currentAmount = monthMap.get(monthName) || 0;
        monthMap.set(monthName, currentAmount + Number(expense.amount));
      }
    });
    
    const processedMonthly: MonthlyExpense[] = Array.from(monthMap.entries()).map(([name, amount]) => ({
      name,
      amount
    }));
    
    setMonthlyExpenses(processedMonthly);
  };

  const calculateInsights = () => {
    if (expenses.length === 0) {
      setInsights([]);
      return;
    }

    const newInsights: ExpenseInsight[] = [];
    
    // Get expenses from current month and previous month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const currentMonthExpenses = expenses.filter(expense => 
      new Date(expense.date) >= currentMonthStart
    );
    
    const previousMonthExpenses = expenses.filter(expense => 
      new Date(expense.date) >= previousMonthStart && 
      new Date(expense.date) < currentMonthStart
    );
    
    // Calculate spending by category for current and previous month
    const currentMonthByCategory = new Map<string, number>();
    const previousMonthByCategory = new Map<string, number>();
    
    currentMonthExpenses.forEach(expense => {
      const current = currentMonthByCategory.get(expense.category) || 0;
      currentMonthByCategory.set(expense.category, current + Number(expense.amount));
    });
    
    previousMonthExpenses.forEach(expense => {
      const current = previousMonthByCategory.get(expense.category) || 0;
      previousMonthByCategory.set(expense.category, current + Number(expense.amount));
    });
    
    // Compare spending and generate insights
    currentMonthByCategory.forEach((amount, category) => {
      const previousAmount = previousMonthByCategory.get(category) || 0;
      
      if (previousAmount > 0) {
        const percentChange = ((amount - previousAmount) / previousAmount) * 100;
        
        if (percentChange > 15) {
          newInsights.push({
            title: "Spending Increase",
            description: `Your ${category.toLowerCase()} expenses increased by ${Math.round(percentChange)}% compared to last month`,
            category
          });
        } else if (percentChange < -15) {
          newInsights.push({
            title: "Spending Decrease",
            description: `Great job! Your ${category.toLowerCase()} expenses decreased by ${Math.round(Math.abs(percentChange))}% compared to last month`,
            category
          });
        }
      }
    });
    
    // Find unusually large expenses
    const categoryAverages = new Map<string, number>();
    const categoryCounts = new Map<string, number>();
    
    expenses.forEach(expense => {
      const current = categoryAverages.get(expense.category) || 0;
      const count = categoryCounts.get(expense.category) || 0;
      
      categoryAverages.set(expense.category, current + Number(expense.amount));
      categoryCounts.set(expense.category, count + 1);
    });
    
    categoryAverages.forEach((total, category) => {
      const count = categoryCounts.get(category) || 1;
      categoryAverages.set(category, total / count);
    });
    
    currentMonthExpenses.forEach(expense => {
      const average = categoryAverages.get(expense.category) || 0;
      
      if (Number(expense.amount) > average * 2) {
        newInsights.push({
          title: "Unusual Expense",
          description: `You spent $${Number(expense.amount).toFixed(2)} on ${expense.description || expense.category.toLowerCase()}, which is higher than your average ${expense.category.toLowerCase()} expense`,
          category: expense.category
        });
      }
    });
    
    // Add potential savings insight
    const subscriptionCategories = ["Entertainment", "Bills"];
    let potentialSavingsFound = false;
    
    subscriptionCategories.forEach(category => {
      if (currentMonthByCategory.has(category) && currentMonthByCategory.get(category)! > 50) {
        newInsights.push({
          title: "Potential Savings",
          description: `You could save money by reviewing your ${category.toLowerCase()} subscriptions`,
          category
        });
        potentialSavingsFound = true;
      }
    });
    
    // Limit to 3 most relevant insights
    setInsights(newInsights.slice(0, 3));
  };

  return {
    expenses,
    isLoading,
    categories,
    monthlyExpenses,
    insights,
    addExpense,
    updateExpense,
    deleteExpense,
    fetchExpenses
  };
}
