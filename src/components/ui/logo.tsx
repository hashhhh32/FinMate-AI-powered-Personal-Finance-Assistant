import React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  iconClassName?: string;
  textClassName?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  className,
  showIcon = true,
  iconClassName,
  textClassName
}) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <div className="relative">
          <TrendingUp 
            className={cn(
              "h-6 w-6 text-finmate-500",
              iconClassName
            )} 
          />
          <div className="absolute inset-0 bg-finmate-500/20 blur-lg -z-10" />
        </div>
      )}
      <span 
        className={cn(
          "text-xl font-bold bg-gradient-to-r from-finmate-500 to-finmate-600 bg-clip-text text-transparent",
          textClassName
        )}
      >
        FinMate
      </span>
    </div>
  );
};

export default Logo; 