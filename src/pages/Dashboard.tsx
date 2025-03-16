
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

const Dashboard = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
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
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
