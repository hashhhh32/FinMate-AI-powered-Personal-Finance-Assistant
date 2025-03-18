
import React from "react";
import { Route, Routes } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import DashboardTransactions from "@/components/dashboard/DashboardTransactions";
import DashboardBudget from "@/components/dashboard/DashboardBudget";
import DashboardInvestments from "@/components/dashboard/DashboardInvestments";
import DashboardSettings from "@/components/dashboard/DashboardSettings";
import DashboardExpenses from "@/components/dashboard/DashboardExpenses";
import DashboardStocks from "@/components/dashboard/DashboardStocks";
import DashboardPortfolio from "@/components/dashboard/DashboardPortfolio";
import DashboardCredit from "@/components/dashboard/DashboardCredit";
import DashboardAssistant from "@/components/dashboard/DashboardAssistant";
import DashboardProfile from "@/components/dashboard/DashboardProfile";
import TradingAssistant from "@/components/trading/TradingAssistant";

// Create a wrapper component for the Trading page
const DashboardTrading = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trading Platform</h2>
          <p className="text-muted-foreground">
            Execute trades and manage your portfolio with our AI-powered trading assistant
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <TradingAssistant />
        </div>
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300 flex items-center">
              Paper Trading Mode
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              This is a paper trading environment. No real money is being used. Practice trading without risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col lg:ml-60">
          <DashboardHeader />
          <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
            <Routes>
              <Route path="/" element={<DashboardOverview />} />
              <Route path="/transactions" element={<DashboardTransactions />} />
              <Route path="/budget" element={<DashboardBudget />} />
              <Route path="/investments" element={<DashboardInvestments />} />
              <Route path="/settings" element={<DashboardSettings />} />
              <Route path="/expenses" element={<DashboardExpenses />} />
              <Route path="/stocks" element={<DashboardStocks />} />
              <Route path="/portfolio" element={<DashboardPortfolio />} />
              <Route path="/credit" element={<DashboardCredit />} />
              <Route path="/assistant" element={<DashboardAssistant />} />
              <Route path="/trading" element={<DashboardTrading />} />
              <Route path="/profile" element={<DashboardProfile />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
