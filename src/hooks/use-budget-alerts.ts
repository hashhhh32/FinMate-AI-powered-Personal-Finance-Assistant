
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BudgetAlert } from "@/types/expense";

export function useBudgetAlerts() {
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    // Fetch budget alerts
    fetchBudgetAlerts();

    // Set up real-time subscription
    const channel = supabase
      .channel('budget-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_alerts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setBudgetAlerts((prev) => [payload.new as BudgetAlert, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setBudgetAlerts((prev) => 
              prev.map((alert) => 
                alert.id === payload.new.id ? payload.new as BudgetAlert : alert
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBudgetAlerts((prev) => 
              prev.filter((alert) => alert.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBudgetAlerts = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('budget_alerts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setBudgetAlerts(data || []);
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Error fetching budget alerts",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const addBudgetAlert = async (newAlert: Omit<BudgetAlert, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('budget_alerts')
        .insert([
          { 
            ...newAlert,
            user_id: user?.id
          }
        ])
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Budget alert added",
        description: "Your budget alert has been successfully added"
      });
      
      return data[0];
    } catch (error: any) {
      toast({
        title: "Error adding budget alert",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const updateBudgetAlert = async (id: string, updatedAlert: Partial<BudgetAlert>) => {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update(updatedAlert)
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Budget alert updated",
        description: "Your budget alert has been successfully updated"
      });
    } catch (error: any) {
      toast({
        title: "Error updating budget alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteBudgetAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Budget alert deleted",
        description: "Your budget alert has been successfully deleted"
      });
    } catch (error: any) {
      toast({
        title: "Error deleting budget alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    budgetAlerts,
    isLoading,
    addBudgetAlert,
    updateBudgetAlert,
    deleteBudgetAlert,
    fetchBudgetAlerts
  };
}
