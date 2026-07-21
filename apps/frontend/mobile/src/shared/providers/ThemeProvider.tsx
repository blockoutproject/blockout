import {DarkTheme, ThemeProvider as NavigationThemeProvider} from "@react-navigation/native";
import React, {createContext, ReactNode, useContext} from "react";

import {AppTheme, darkTheme} from "@/src/shared/theme/themes";

type Props = {
  children: ReactNode;
};

const ThemeContext = createContext<AppTheme | null>(null);

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: "#e4e4e7",
    background: "#0b0c0d",
    card: "#1a1a1c",
    text: "#ffffff",
    border: "#38383a",
    notification: "#ff453a",
  },
};

export const ThemeProvider = ({children}: Props) => {
  return (
    <ThemeContext.Provider value={darkTheme}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): AppTheme => {
  const theme = useContext(ThemeContext);

  if (!theme) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return theme;
};
