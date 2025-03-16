
export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  date: string;
  created_at: string;
};

export type ExpenseCategory = {
  name: string;
  value: number;
  color: string;
};

export type BudgetAlert = {
  id: string;
  category: string;
  limit_amount: number;
  period: string;
  created_at: string;
};

export type ExpenseInsight = {
  title: string;
  description: string;
  category: string;
};

export type MonthlyExpense = {
  name: string;
  amount: number;
};
