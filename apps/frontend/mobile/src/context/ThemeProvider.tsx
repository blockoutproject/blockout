import React, {createContext, ReactNode, useContext} from "react";
import {useColorScheme} from "react-native";
import {AppTheme} from "../types/Theme";
import {darkTheme} from "../theme/themes";

const ThemeContext = createContext<AppTheme>(darkTheme);

export const ThemeProvider = ({children}: { children: ReactNode }) => {
  const colorScheme = useColorScheme();
  const theme = darkTheme;

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
