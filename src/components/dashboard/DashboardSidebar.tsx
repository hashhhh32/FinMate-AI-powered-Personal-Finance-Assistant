
import React from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  LineChart,
  TrendingUp,
  BarChart4,
  Briefcase,
  CreditCard,
  Settings,
  Bot,
  DollarSign,
  ArrowRightLeft,
  LogOut,
  User,
} from "lucide-react";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
    isActive
      ? "bg-secondary text-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

const DashboardSidebar = () => {
  const { open: sidebarOpen } = useSidebar();
  const location = useLocation();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate("/signin");
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-transform lg:translate-x-0 lg:w-60",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="relative flex h-full flex-col overflow-y-auto px-3 py-4">
        <Link to="/" className="flex items-center mb-5 px-2 py-1">
          <DollarSign className="h-6 w-6 mr-2 text-primary" />
          <h1 className="text-xl font-bold text-foreground">FinMate</h1>
        </Link>

        <nav className="flex-1 space-y-1">
          <ul className="space-y-1">
            <li>
              <NavLink to="/dashboard" end className={navLinkClasses}>
                <LayoutDashboard className="h-5 w-5 mr-3" />
                Dashboard
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/transactions" className={navLinkClasses}>
                <Receipt className="h-5 w-5 mr-3" />
                Transactions
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/expenses" className={navLinkClasses}>
                <PiggyBank className="h-5 w-5 mr-3" />
                Expenses
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/budget" className={navLinkClasses}>
                <LineChart className="h-5 w-5 mr-3" />
                Budget
              </NavLink>
            </li>
            <Separator className="my-2" />
            <li>
              <NavLink to="/dashboard/stocks" className={navLinkClasses}>
                <TrendingUp className="h-5 w-5 mr-3" />
                Stocks
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/portfolio" className={navLinkClasses}>
                <BarChart4 className="h-5 w-5 mr-3" />
                Portfolio
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/trading" className={navLinkClasses}>
                <ArrowRightLeft className="h-5 w-5 mr-3" />
                Trading
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/investments" className={navLinkClasses}>
                <Briefcase className="h-5 w-5 mr-3" />
                Investments
              </NavLink>
            </li>
            <Separator className="my-2" />
            <li>
              <NavLink to="/dashboard/credit" className={navLinkClasses}>
                <CreditCard className="h-5 w-5 mr-3" />
                Credit
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/assistant" className={navLinkClasses}>
                <Bot className="h-5 w-5 mr-3" />
                AI Assistant
              </NavLink>
            </li>
            <Separator className="my-2" />
            <li>
              <NavLink to="/dashboard/settings" className={navLinkClasses}>
                <Settings className="h-5 w-5 mr-3" />
                Settings
              </NavLink>
            </li>
            <li>
              <NavLink to="/dashboard/profile" className={navLinkClasses}>
                <User className="h-5 w-5 mr-3" />
                Profile
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="mt-auto">
          <Separator className="my-2" />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
