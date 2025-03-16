
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, ShoppingCart, Home, Coffee, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";

// Mock transaction data
const transactions = [
  {
    id: "t1",
    name: "Amazon",
    amount: -89.99,
    date: "2023-06-15",
    category: "Shopping",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  {
    id: "t2",
    name: "Paycheck",
    amount: 2450.00,
    date: "2023-06-14",
    category: "Income",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "t3",
    name: "Rent",
    amount: -1200.00,
    date: "2023-06-10",
    category: "Housing",
    icon: <Home className="h-4 w-4" />,
  },
  {
    id: "t4",
    name: "Starbucks",
    amount: -5.75,
    date: "2023-06-09",
    category: "Food & Drink",
    icon: <Coffee className="h-4 w-4" />,
  },
  {
    id: "t5",
    name: "Netflix",
    amount: -15.99,
    date: "2023-06-08",
    category: "Entertainment",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "t6",
    name: "Uber",
    amount: -24.50,
    date: "2023-06-07",
    category: "Transportation",
    icon: <CreditCard className="h-4 w-4" />,
  },
  {
    id: "t7",
    name: "Side Gig",
    amount: 350.00,
    date: "2023-06-05",
    category: "Income",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    id: "t8",
    name: "Grocery Store",
    amount: -128.45,
    date: "2023-06-03",
    category: "Groceries",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
];

const DashboardTransactions = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
        <Button>Add Transaction</Button>
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
            <Input placeholder="Search transactions..." className="md:w-1/3" />
            <Select defaultValue="all">
              <SelectTrigger className="md:w-1/3">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="housing">Housing</SelectItem>
                <SelectItem value="food">Food & Drink</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="30">
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
                            {transaction.icon}
                          </div>
                          <div>{transaction.name}</div>
                        </div>
                      </td>
                      <td className="p-4 align-middle">{transaction.category}</td>
                      <td className="p-4 align-middle">{transaction.date}</td>
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
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">1</span> to{" "}
              <span className="font-medium">8</span> of{" "}
              <span className="font-medium">100</span> transactions
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
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
