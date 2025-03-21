import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddBudgetDialogProps {
  onBudgetUpdated: () => void;
  currentBudgets: Record<string, number>;
}

const categories = [
  "Housing",
  "Groceries",
  "Transportation",
  "Dining Out",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Healthcare",
  "Education",
  "Savings",
  "Investments",
  "Other"
];

export function AddBudgetDialog({ onBudgetUpdated, currentBudgets }: AddBudgetDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to set budgets");
      return;
    }

    if (!selectedCategory || !amount) {
      toast.error("Please select a category and enter an amount");
      return;
    }

    try {
      setIsLoading(true);

      const budgetAmount = parseFloat(amount);
      if (isNaN(budgetAmount) || budgetAmount < 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      // Get current month and year
      const currentDate = new Date();
      const month = currentDate.toISOString().slice(0, 7); // Format: YYYY-MM

      // Update or insert budget in the database
      const { error } = await supabase
        .from('budgets')
        .upsert({
          user_id: user.id,
          category: selectedCategory,
          amount: budgetAmount,
          month: month,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`Budget for ${selectedCategory} updated successfully`);
      setIsOpen(false);
      onBudgetUpdated();
      
      // Reset form
      setSelectedCategory("");
      setAmount("");
    } catch (error: any) {
      console.error('Error updating budget:', error);
      toast.error(error.message || "Failed to update budget");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Set Budget</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Set Monthly Budget</DialogTitle>
            <DialogDescription>
              Set your monthly budget for a category. This will help you track your spending.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="category">Category</label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="amount">Amount</label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder={currentBudgets[selectedCategory]?.toString() || "0.00"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 