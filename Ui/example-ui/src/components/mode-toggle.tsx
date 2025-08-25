import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "~/components/theme-provider";
import { cn } from "~/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center rounded-md border bg-background p-1">
      <button
        onClick={() => setTheme("system")}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-sm transition-colors z-20",
          theme === "system"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="System theme"
      >
        {theme === "system" && (
          <motion.span
            layoutId="theme-indicator"
            className="absolute inset-0 bg-muted rounded-sm z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Monitor className="h-4 w-4 relative z-20" />
        <span className="sr-only">System theme</span>
      </button>
      <button
        onClick={() => setTheme("light")}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-sm transition-colors z-20",
          theme === "light"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Light theme"
      >
        {theme === "light" && (
          <motion.span
            layoutId="theme-indicator"
            className="absolute inset-0 bg-muted rounded-sm z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Sun className="h-4 w-4 relative z-20" />
        <span className="sr-only">Light theme</span>
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={cn(
          "relative flex h-8 w-8 items-center justify-center rounded-sm transition-colors z-20",
          theme === "dark"
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Dark theme"
      >
        {theme === "dark" && (
          <motion.span
            layoutId="theme-indicator"
            className="absolute inset-0 bg-muted rounded-sm z-10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <Moon className="h-4 w-4 relative z-20" />
        <span className="sr-only">Dark theme</span>
      </button>
    </div>
  );
}
