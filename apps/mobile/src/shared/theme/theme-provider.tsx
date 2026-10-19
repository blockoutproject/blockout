import { createContext, useContext, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "expo-router";
import {
  appearanceColors,
  membershipColors,
  neutralContext,
  type ContextColors,
} from "./tokens";

/** Current presentation only: no stored preference, membership authority or sporting-color derivation. */
export interface Theme {
  scheme: "light" | "dark";
  colors: typeof appearanceColors.light;
  context: ContextColors;
  membership: typeof membershipColors.light;
}

/** Owners supply current presentation inputs; unknown/inactive Pro is represented by the default false. */
export interface ThemeProviderProps extends PropsWithChildren {
  context?: { light: ContextColors; dark: ContextColors };
  proAccent?: boolean;
}

const ThemeContext = createContext<Theme | null>(null);

/** Supplies app and native navigation colors from one system appearance; absent schemes fall back to light. */
export function ThemeProvider({
  children,
  context = neutralContext,
  proAccent = false,
}: ThemeProviderProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const colors = appearanceColors[scheme];
  const navigationTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <ThemeContext
      value={{
        scheme,
        colors,
        context: context[scheme],
        membership: proAccent
          ? membershipColors.pro[scheme]
          : membershipColors[scheme],
      }}
    >
      <NavigationThemeProvider
        value={{
          ...navigationTheme,
          colors: {
            ...navigationTheme.colors,
            primary: context[scheme].primary,
            background: colors.canvas,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
          },
        }}
      >
        {children}
      </NavigationThemeProvider>
    </ThemeContext>
  );
}

/** Reads current semantic presentation; using a control outside its root provider is a programming error. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("Shared controls require ThemeProvider.");
  return theme;
}
