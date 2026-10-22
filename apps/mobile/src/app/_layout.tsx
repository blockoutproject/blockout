import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useState } from "react";
import { useCurrentAccount } from "../features/accounts/api/use-current-account";
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
import { ProProvider, usePro } from "../features/pro";

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

/** Restores only the existing local account; neither absence nor restoration triggers POST. */
function CurrentAccountObserver() {
  useCurrentAccount();
  return null;
}

/** Projects only current SDK-active membership into the sole theme owner without remounting routes. */
function ThemedNavigation() {
  const { state } = usePro();
  return (
    <ThemeProvider proAccent={state.status === "active"}>
      <Navigation />
    </ThemeProvider>
  );
}

/** Composes session, cache and live appearance around navigation with native route presentation. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  useEffect(() => () => queryClient.clear(), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <AccountSessionProvider>
        <CurrentAccountObserver />
        <ProProvider>
          <ThemedNavigation />
        </ProProvider>
      </AccountSessionProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
