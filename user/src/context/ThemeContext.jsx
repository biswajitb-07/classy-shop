import { createContext, useContext, useEffect, useMemo, useState } from "react";

const THEME_KEY = "classy-store-user-theme";
const THEME_DEFAULT_VERSION_KEY = "classy-store-user-theme-default-v2";
const ThemeContext = createContext(null);

const getInitialTheme = () => {
  if (typeof window === "undefined") return "light";
  const hasAppliedDefault = window.localStorage.getItem(THEME_DEFAULT_VERSION_KEY);
  if (!hasAppliedDefault) {
    window.localStorage.setItem(THEME_KEY, "light");
    window.localStorage.setItem(THEME_DEFAULT_VERSION_KEY, "true");
    return "light";
  }
  const saved = window.localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "light";
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  const resetTheme = () => {
    const nextTheme = "light";
    setTheme(nextTheme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_KEY, nextTheme);
      window.localStorage.setItem(THEME_DEFAULT_VERSION_KEY, "true");
    }
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      resetTheme,
      toggleTheme: () => setTheme((current) => (current === "dark" ? "light" : "dark")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
};
