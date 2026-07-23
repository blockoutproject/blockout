import {
  DarkTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import React, { createContext, type ReactNode, useContext } from "react";

import { colors } from "@/src/shared/theme/tokens";
import { type AppTheme, darkTheme } from "@/src/shared/theme/themes";

type ThemeProviderProps = {
  children: ReactNode;
};

const ThemeContext = createContext<AppTheme | null>(null);

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.text.secondary,
    background: colors.background.default,
    card: colors.surface.default,
    text: colors.text.primary,
    border: colors.border.default,
    notification: colors.status.error,
  },
};

/**
 * Provides the single Blockout dark theme to React Native and React Navigation consumers.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={darkTheme}>
      <NavigationThemeProvider value={navigationTheme}>
        {children}
      </NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

/**
 * Returns the active Blockout theme inside the application theme boundary.
 */
export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return theme;
}
