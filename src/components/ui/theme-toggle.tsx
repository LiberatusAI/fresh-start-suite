
import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";

interface ThemeToggleProps {
  className?: string;
  iconSize?: number;
  variant?: "default" | "ghost" | "outline" | "secondary";
}

export function ThemeToggle({ 
  className = "w-8 h-8 rounded-full", 
  iconSize = 4,
  variant = "ghost" 
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant={variant}
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className={`h-${iconSize} w-${iconSize} text-gold-light`} />
      ) : (
        <Moon className={`h-${iconSize} w-${iconSize} text-gold-dark`} />
      )}
    </Button>
  );
}
