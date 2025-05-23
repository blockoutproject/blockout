import React, { createContext, useContext, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "../constants/Theme";
import { AppTheme } from "../types/Theme";

const ThemeContext = createContext<AppTheme>(darkTheme);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const colorScheme = useColorScheme();
    const theme = colorScheme === "dark" ? darkTheme : lightTheme;

    return (
        <ThemeContext.Provider value={theme}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useAppTheme = () => useContext(ThemeContext);