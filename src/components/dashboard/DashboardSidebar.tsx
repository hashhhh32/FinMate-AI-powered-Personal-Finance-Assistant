
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PieChart,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
} from "lucide-react";

const DashboardSidebar = () => {
  const { user, getUserName, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    {
      name: "Overview",
      path: "/dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      name: "Transactions",
      path: "/dashboard/transactions",
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      name: "Budget",
      path: "/dashboard/budget",
      icon: <PieChart className="h-5 w-5" />,
    },
    {
      name: "Investments",
      path: "/dashboard/investments",
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const activeClass = "bg-sidebar-accent text-sidebar-accent-foreground";
  const inactiveClass = "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

  return (
    <Sidebar className="border-r dark:border-r-gray-800">
      <SidebarHeader className="flex justify-between items-center px-6 py-4">
        <NavLink to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text">FinMate</span>
        </NavLink>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="px-4 py-6">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? activeClass : inactiveClass
                }`
              }
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t dark:border-t-gray-800">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-finmate-200 dark:bg-finmate-800 flex items-center justify-center">
              {getUserName()[0] || "U"}
            </div>
            <div className="truncate">
              <div className="text-sm font-medium">{getUserName() || "User"}</div>
              <div className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full text-sidebar-foreground border-sidebar-border flex items-center gap-2"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
