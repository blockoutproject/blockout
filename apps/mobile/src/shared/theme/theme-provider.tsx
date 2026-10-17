import { createContext, useContext, type PropsWithChildren } from "react";
import { useColorScheme } from "react-native";
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

/** Follows native appearance without remounting descendants; light is the absent-scheme fallback. */
export function ThemeProvider({
  children,
  context = neutralContext,
  proAccent = false,
}: ThemeProviderProps) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return (
    <ThemeContext
      value={{
        scheme,
        colors: appearanceColors[scheme],
        context: context[scheme],
        membership: proAccent ? membershipColors.pro : membershipColors[scheme],
      }}
    >
      {children}
    </ThemeContext>
  );
}

/** Reads current semantic presentation; using a control outside its root provider is a programming error. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("Shared controls require ThemeProvider.");
  return theme;
}
