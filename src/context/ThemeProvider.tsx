import React, { createContext, useContext, ReactNode } from "react";
import { useColorScheme } from "react-native";
import { AppTheme } from "../types/Theme";
import { darkTheme, lightTheme } from "../constants/themes";

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