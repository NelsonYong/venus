"use client";

import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "@/app/contexts/theme-context";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getIcon = () => {
    switch (theme) {
      case "light":
        return <Sun size={16} />;
      case "dark":
        return <Moon size={16} />;
      case "system":
        return <Monitor size={16} />;
      default:
        return <Sun size={16} />;
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
      title={`Current theme: ${theme}`}
    >
      {getIcon()}
    </button>
  );
}