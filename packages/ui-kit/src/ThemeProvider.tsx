import { createContext, useContext, useMemo, type ReactNode } from "react";

export type ThemeMode = "light" | "dark";

const ThemeContext = createContext<ThemeMode>("dark");

export function useThemeMode(): ThemeMode {
  return useContext(ThemeContext);
}

export function ThemeProvider({
  mode,
  children,
}: {
  mode: ThemeMode;
  children: ReactNode;
}) {
  const value = useMemo(() => mode, [mode]);
  return (
    <ThemeContext.Provider value={value}>
      <div data-streamdesk-theme={mode} style={{ height: "100%" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}
