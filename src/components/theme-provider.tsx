"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light/dark follows the system by default; class "dark" on <html> (ADR 0007).
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
