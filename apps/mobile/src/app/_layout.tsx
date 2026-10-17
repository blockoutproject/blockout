import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { createQueryClient } from "../shared/query/query-client";
import { initializeSentry } from "../shared/observability/sentry";
import { ThemeProvider, useTheme } from "../shared/theme/theme-provider";

initializeSentry();

/** Updates native route surfaces without replacing the navigation tree. */
function Navigation() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.canvas },
        }}
      />
    </>
  );
}

/** Keeps one cache and one live system-theme owner around the mounted native navigation tree. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Navigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
