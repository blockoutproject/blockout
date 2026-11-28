import { useStackScreenOptions } from "@/shared/native/stack-screen-options";
import { createInstallationAdvertisingPrivacy } from "@/features/advertising/advertising-privacy";
import { AdvertisingProvider } from "@/features/advertising/advertising-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { SplashScreen, Stack, useSegments } from "expo-router";
import {
  NativeSplashHandoff,
  useNativeSplashPending,
} from "@/shared/native/native-splash-handoff";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect, useState } from "react";
import {
  AccountSessionProvider,
  useAccountSession,
} from "@/features/accounts/session/account-session-provider";
import { ApplicationAccessProvider } from "@/features/access/queries/use-application-access";
import {
  AccessAdmissionProvider,
  useAccessAdmission,
} from "@/features/access/queries/use-access-admission";
import { StartupAccessGate } from "@/features/access/screens/access-gate-screen";
import { createQueryClient } from "@/shared/query/query-client";
import { initializeSentry } from "@/shared/observability/sentry";
import { ThemeProvider, useTheme } from "@/shared/theme/theme-provider";
import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import { hasReadError } from "@/shared/components/read-feedback";
import { ProProvider, usePro } from "@/features/pro";
import {
  DiscoveryProvider,
  useDiscovery,
} from "@/features/onboarding/discovery-provider";
import { NotificationLifecycle } from "@/features/notifications/native/notification-lifecycle";
import {
  createPushRegistration,
  type PushRegistration,
} from "@/features/notifications/native/push-registration";

import { cleanupMatchDocuments } from "@/features/sporting/api/match-document";

initializeSentry();
// Expo recommends making this request at module load before auto-hide can run.
void SplashScreen.preventAutoHideAsync();

/** Binds private cache/push lifecycle and separates protected ordinary/operational navigation. */
function Navigation({
  registration,
}: Readonly<{ registration: PushRegistration }>) {
  const splashPending = useNativeSplashPending();
  const screenOptions = useStackScreenOptions(splashPending);
  const { scheme } = useTheme();
  const access = useAccessAdmission();
  const discovery = useDiscovery();
  const session = useAccountSession();
  const waiting =
    (!access.snapshot.complete && !hasReadError(access.query)) ||
    (access.ordinary && (discovery.loading || session.status === "restoring"));
  if (waiting) {
    return null;
  }
  return (
    <>
      <NotificationLifecycle
        registration={registration}
        enabled={access.ordinary && discovery.complete}
      />
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={screenOptions}>
        <Stack.Protected guard={!access.ordinary}>
          <Stack.Screen name="access" />
        </Stack.Protected>
        <Stack.Protected
          guard={access.ordinary && !discovery.complete}
          redirectTo={access.ordinary ? "/sign-in" : "/access"}
        >
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected
          guard={access.ordinary && discovery.complete}
          redirectTo={access.ordinary ? "/onboarding" : "/access"}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(ordinary)" />
          <Stack.Screen name="(recovery)" />
        </Stack.Protected>
        <Stack.Protected guard={access.operations}>
          <Stack.Screen name="(operations)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** Projects membership into the theme and starts advertising in ordinary content. */
function ThemedNavigation({
  registration,
  privacy,
}: Readonly<{
  registration: PushRegistration;
  privacy: ReturnType<typeof createInstallationAdvertisingPrivacy>;
}>) {
  const { state } = usePro();
  const session = useAccountSession();
  const discovery = useDiscovery();
  const [rootGroup] = useSegments();
  return (
    <ThemeProvider proAccent={state.status === "active"}>
      <ActionFeedbackProvider scopeKey={session.subject ?? "guest"}>
        <AdvertisingProvider
          enabled={discovery.complete && rootGroup === "(ordinary)"}
          privacy={privacy}
        >
          <Navigation registration={registration} />
        </AdvertisingProvider>
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

function ProNavigation({
  registration,
  privacy,
}: Readonly<{
  registration: PushRegistration;
  privacy: ReturnType<typeof createInstallationAdvertisingPrivacy>;
}>) {
  const access = useAccessAdmission();
  return (
    <ProProvider presentationEnabled={access.ordinary}>
      <ThemedNavigation registration={registration} privacy={privacy} />
    </ProProvider>
  );
}

/** Keeps public checking and discovery above account-subject lifetimes; secure initialization still gates Auth0. */
function RootLayout() {
  useEffect(cleanupMatchDocuments, []);
  const [queryClient] = useState(createQueryClient);
  const [registration] = useState(createPushRegistration);
  const [privacy] = useState(createInstallationAdvertisingPrivacy);
  useEffect(() => () => privacy.dispose(), [privacy]);
  // Child Query observers unsubscribe before their cache is cleared, avoiding orphaned GC timers.
  useEffect(
    () => () => void Promise.resolve().then(() => queryClient.clear()),
    [queryClient],
  );
  return (
    <GestureHandlerRootView style={styles.root}>
      <NativeSplashHandoff>
        <QueryClientProvider client={queryClient}>
          <ApplicationAccessProvider>
            <DiscoveryProvider>
              <AccountSessionProvider
                removePushRegistration={registration.remove}
                abandonPushRegistration={registration.abandon}
                fallback={
                  <ThemeProvider>
                    <ActionFeedbackProvider scopeKey="startup">
                      <StartupAccessGate />
                    </ActionFeedbackProvider>
                  </ThemeProvider>
                }
              >
                <AccessAdmissionProvider>
                  <ProNavigation
                    registration={registration}
                    privacy={privacy}
                  />
                </AccessAdmissionProvider>
              </AccountSessionProvider>
            </DiscoveryProvider>
          </ApplicationAccessProvider>
        </QueryClientProvider>
      </NativeSplashHandoff>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default Sentry.wrap(RootLayout);
