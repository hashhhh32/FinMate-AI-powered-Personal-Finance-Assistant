
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

// Portfolio types
export type PortfolioHolding = {
  id: string;
  symbol: string;
  company_name: string;
  shares: number;
  purchase_price: number;
  purchase_date: string;
  current_price: number | null;
  last_updated: string;
  created_at: string;
};

export type PortfolioTransaction = {
  id: string;
  holding_id: string;
  symbol: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  transaction_date: string;
  created_at: string;
};

export type PortfolioSummary = {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  profitPercentage: number;
};

export type AssetAllocation = {
  name: string;
  value: number;
  color: string;
};
