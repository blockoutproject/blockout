import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
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
import { ActionFeedbackProvider } from "../shared/components/action-feedback";
import { ProProvider, usePro } from "../features/pro";
import {
  DiscoveryProvider,
  useDiscovery,
} from "../features/onboarding/discovery-provider";
import {
  AgeDeclarationProvider,
  useAgeDeclaration,
} from "../features/advertising/age-declaration-provider";
import { NotificationLifecycle } from "../features/notifications/native/notification-lifecycle";
import {
  createPushRegistration,
  type PushRegistration,
} from "../features/notifications/native/push-registration";

initializeSentry();

/** Binds private cache cleanup and separates protected ordinary/operational navigation. */
function Navigation({ registration }: { registration: PushRegistration }) {
  const theme = useTheme();
  const client = useQueryClient();
  const { subscribe, isCurrent } = useAccountSession();
  const access = useAccessAdmission();
  const discovery = useDiscovery();
  const age = useAgeDeclaration();
  useLayoutEffect(
    () => bindSessionQueries(client, subscribe, isCurrent),
    [client, subscribe, isCurrent],
  );
  return (
    <AccountAdmissionProvider admitted={access.ordinary}>
      <NotificationLifecycle
        registration={registration}
        enabled={access.ordinary && discovery.complete}
      />
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      {discovery.loading ? (
        <StartupAccessGate />
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!access.ordinary}>
            <Stack.Screen name="access" />
          </Stack.Protected>
          <Stack.Protected
            guard={access.ordinary && !discovery.complete}
            redirectTo={access.ordinary ? "/sign-in" : "/access"}
          >
            <Stack.Screen name="onboarding" />
          </Stack.Protected>
          <Stack.Protected guard={access.ordinary && discovery.complete}>
            <Stack.Screen name="(ordinary)" />
          </Stack.Protected>
          <Stack.Protected
            guard={access.ordinary && discovery.complete && age.required}
            redirectTo={access.ordinary ? "/" : "/access"}
          >
            <Stack.Screen
              name="age-declaration"
              options={{ gestureEnabled: false }}
            />
          </Stack.Protected>
          <Stack.Protected guard={access.operations}>
            <Stack.Screen name="(operations)" />
          </Stack.Protected>
        </Stack>
      )}
    </AccountAdmissionProvider>
  );
}

/** Defers age I/O until discovery releases ordinary entry, preserving independent discovery read/retry. */
function InstallationNavigation({
  registration,
}: {
  registration: PushRegistration;
}) {
  const discovery = useDiscovery();
  return (
    <AgeDeclarationProvider enabled={discovery.complete}>
      <Navigation registration={registration} />
    </AgeDeclarationProvider>
  );
}

/** Projects SDK-active membership into the sole system theme owner without remounting routes. */
function ThemedNavigation({
  registration,
}: {
  registration: PushRegistration;
}) {
  const { state } = usePro();
  const session = useAccountSession();
  return (
    <ThemeProvider proAccent={state.status === "active"}>
      <ActionFeedbackProvider scopeKey={session.generation}>
        <DiscoveryProvider>
          <InstallationNavigation registration={registration} />
        </DiscoveryProvider>
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

/** Starts public checking above F14/Auth0; all session restoration and returns preserve that process owner. */
function RootLayout() {
  const [queryClient] = useState(createQueryClient);
  const [registration] = useState(createPushRegistration);
  useEffect(() => () => queryClient.clear(), [queryClient]);
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ApplicationAccessProvider>
          <AccountSessionProvider
            preparePushRemoval={registration.prepareRemoval}
            fallback={
              <ThemeProvider>
                <ActionFeedbackProvider scopeKey="startup">
                  <StartupAccessGate />
                </ActionFeedbackProvider>
              </ThemeProvider>
            }
          >
            <AccessAdmissionProvider>
              <ProProvider>
                <ThemedNavigation registration={registration} />
              </ProProvider>
            </AccessAdmissionProvider>
          </AccountSessionProvider>
        </ApplicationAccessProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default Sentry.wrap(RootLayout);
