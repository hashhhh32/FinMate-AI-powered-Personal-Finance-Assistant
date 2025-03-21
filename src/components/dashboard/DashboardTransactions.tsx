import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, ShoppingCart, Home, Coffee, DollarSign, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AddTransactionDialog } from "./AddTransactionDialog";

// Define transaction type
interface Transaction {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  created_at: string;
}

// Category icons mapping
const categoryIcons: Record<string, JSX.Element> = {
  "Shopping": <ShoppingCart className="h-4 w-4" />,
  "Income": <DollarSign className="h-4 w-4" />,
  "Housing": <Home className="h-4 w-4" />,
  "Food & Drink": <Coffee className="h-4 w-4" />,
  "Entertainment": <CreditCard className="h-4 w-4" />,
  "Transportation": <CreditCard className="h-4 w-4" />,
  "Groceries": <ShoppingCart className="h-4 w-4" />,
  "Other": <CreditCard className="h-4 w-4" />
};

const DashboardTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState("30");
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch transactions from Supabase
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      
      if (!user) return;

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      if (dateRange === "7") {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === "30") {
        startDate.setDate(now.getDate() - 30);
      } else if (dateRange === "90") {
        startDate.setDate(now.getDate() - 90);
      } else if (dateRange === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Build query
      let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: false });

      // Apply category filter
      if (selectedCategory !== "all") {
        query = query.eq('category', selectedCategory);
      }

      // Apply search filter
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      if (data) {
        setTransactions(data as Transaction[]);
        setTotalCount(count || 0);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch transactions when filters change
  useEffect(() => {
    fetchTransactions();
  }, [user, searchQuery, selectedCategory, dateRange, currentPage]);

  // Get unique categories for the select dropdown
  const getUniqueCategories = () => {
    const categories = new Set(transactions.map(t => t.category));
    return Array.from(categories);
  };

  // Handle page navigation
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage * itemsPerPage < totalCount) {
      setCurrentPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <AddTransactionDialog onTransactionAdded={fetchTransactions} />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            A list of your recent transactions across all accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4 md:flex-row">
            <Input 
              placeholder="Search transactions..." 
              className="md:w-1/3"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select 
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="md:w-1/3">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getUniqueCategories().map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select 
              value={dateRange}
              onValueChange={setDateRange}
            >
              <SelectTrigger className="md:w-1/3">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading transactions...</span>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No transactions found
                </div>
              ) : (
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium">Transaction</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Category</th>
                      <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                      <th className="h-12 px-4 text-right align-middle font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {transactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                      >
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                              {categoryIcons[transaction.category] || <CreditCard className="h-4 w-4" />}
                            </div>
                            <div>
                              <div>{transaction.name}</div>
                              {transaction.description && (
                                <div className="text-xs text-muted-foreground">{transaction.description}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 align-middle">{transaction.category}</td>
                        <td className="p-4 align-middle">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className={`flex items-center justify-end gap-1 font-medium ${
                            transaction.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {transaction.amount > 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}</span> to{" "}
              <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
              <span className="font-medium">{totalCount}</span> transactions
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage * itemsPerPage >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardTransactions;
