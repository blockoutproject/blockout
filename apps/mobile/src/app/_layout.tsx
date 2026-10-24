import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../features/accounts/session/account-session-provider";
import { AccountAdmissionProvider } from "../features/accounts/components/account-admission";
import { ApplicationAccessProvider } from "../features/access/queries/use-application-access";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "../features/access/queries/use-access-admission";
import { StartupAccessGate } from "../features/access/screens/access-gate-screen";
import {
  bindSessionQueries,
  createQueryClient,
} from "../shared/query/query-client";
import { initializeSentry } from "../shared/observability/sentry";
import { ThemeProvider, useTheme } from "../shared/theme/theme-provider";
import { ProProvider, usePro } from "../features/pro";

initializeSentry();

/** Binds private cache cleanup and separates protected ordinary/operational navigation. */
function Navigation() {
  const theme = useTheme();
  const client = useQueryClient();
  const { subscribe, isCurrent } = useAccountSession();
  const access = useAccessAdmission();
  useLayoutEffect(
    () => bindSessionQueries(client, subscribe, isCurrent),
    [client, subscribe, isCurrent],
  );
  return (
    <AccountAdmissionProvider admitted={access.ordinary}>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!access.ordinary}>
          <Stack.Screen name="access" />
        </Stack.Protected>
        <Stack.Protected guard={access.ordinary}>
          <Stack.Screen name="(ordinary)" />
        </Stack.Protected>
        <Stack.Protected guard={access.operations}>
          <Stack.Screen name="(operations)" />
        </Stack.Protected>
      </Stack>
    </AccountAdmissionProvider>
  );
}

/** Projects SDK-active membership into the sole system theme owner without remounting routes. */
function ThemedNavigation() {
  const { state } = usePro();
  return (
    <ThemeProvider proAccent={state.status === "active"}>
      <Navigation />
    </ThemeProvider>
  );
}

/** Starts public checking above F14/Auth0; all session restoration and returns preserve that process owner. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
    <QueryClientProvider client={queryClient}>
      <ApplicationAccessProvider>
        <AccountSessionProvider
          fallback={
            <ThemeProvider>
              <StartupAccessGate />
            </ThemeProvider>
          }
        >
          <AccessAdmissionProvider>
            <ProProvider>
              <ThemedNavigation />
            </ProProvider>
          </AccessAdmissionProvider>
        </AccountSessionProvider>
      </ApplicationAccessProvider>
    </QueryClientProvider>
  );
}
export default Sentry.wrap(RootLayout);
