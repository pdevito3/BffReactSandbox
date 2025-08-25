import { createContext, useContext, useLayoutEffect, useState } from "react";
import { LoadingSpinner } from "~/components/svgs/loading-spinner";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [showLoading, setShowLoading] = useState(true);

  useLayoutEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Initialize theme from localStorage on client-side
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      const startTime = Date.now();
      const root = document.documentElement;
      const storedTheme =
        (localStorage.getItem(storageKey) as Theme) || defaultTheme;

      root.classList.remove("light", "dark");

      if (storedTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
      } else {
        root.classList.add(storedTheme);
      }

      setTheme(storedTheme);

      // Ensure minimum 400ms loading time
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 400 - elapsed);

      setTimeout(() => {
        setShowLoading(false);
      }, remainingTime);
    }
  }, []);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  };

  if (showLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
