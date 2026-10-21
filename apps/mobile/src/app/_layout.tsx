import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StyleSheet } from "react-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useLayoutEffect, useState } from "react";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../features/accounts/session/account-session-provider";
import {
  bindSessionQueries,
  createQueryClient,
} from "../shared/query/query-client";
import { initializeSentry } from "../shared/observability/sentry";
import { ThemeProvider, useTheme } from "../shared/theme/theme-provider";

initializeSentry();

/** Binds private cache cleanup to the session owner and renders navigation in the current system theme. */
function Navigation() {
  const theme = useTheme();
  const client = useQueryClient();
  const { subscribe, isCurrent } = useAccountSession();
  useLayoutEffect(
    () => bindSessionQueries(client, subscribe, isCurrent),
    [client, subscribe, isCurrent],
  );
  return (
    <>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

/** Composes session, cache and live appearance around navigation and the shared modal host. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AccountSessionProvider>
            <BottomSheetModalProvider>
              <Navigation />
            </BottomSheetModalProvider>
          </AccountSessionProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default Sentry.wrap(RootLayout);
