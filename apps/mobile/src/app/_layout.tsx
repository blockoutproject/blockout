import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { AccountSessionProvider } from "../features/accounts/session/account-session-provider";
import { createQueryClient } from "../shared/query/query-client";
import { initializeSentry } from "../shared/observability/sentry";
import { ThemeProvider, useTheme } from "../shared/theme/theme-provider";

initializeSentry();

/** Keeps status-bar text aligned with the theme's light fallback, including the native unspecified scheme. */
function Navigation() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

/** Composes the transient session, cache and live system theme around native navigation. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccountSessionProvider>
          <Navigation />
        </AccountSessionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
