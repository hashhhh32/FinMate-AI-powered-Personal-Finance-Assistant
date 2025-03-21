import React from "react";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/ui/logo";

const DashboardHeader = () => {
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <div className="h-6 w-px bg-border hidden md:block" />
          <h1 className="text-xl font-semibold text-foreground/80 hidden md:block">Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-64 pl-8 bg-background/50 focus:bg-background transition-colors"
            />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative hover:bg-background/80"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-finmate-500 text-[10px] font-medium text-white flex items-center justify-center">
              3
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
