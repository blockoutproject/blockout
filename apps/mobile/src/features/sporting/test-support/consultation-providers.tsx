import { useLayoutEffect, useState, type PropsWithChildren } from "react";
import {
  QueryClientProvider,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { ApplicationAccessProvider } from "../../access/queries/use-application-access";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { AdvertisingProviders } from "../../advertising/test-support/advertising-providers";

/** Real consultation owners; suites supply external HTTP/native doubles and own both cache cleanups. */
export function ConsultationProviders({
  children,
  publicClient,
  onClient,
}: PropsWithChildren<{
  publicClient: QueryClient;
  onClient(client: QueryClient): void;
}>) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <QueryClientProvider client={publicClient}>
          <ThemeProvider>
            <ActionFeedbackProvider scopeKey="consultation-test">
              <ApplicationAccessProvider>
                <AccountSessionProvider>
                  <PrivateQueries onClient={onClient}>
                    <AdvertisingProviders>{children}</AdvertisingProviders>
                  </PrivateQueries>
                </AccountSessionProvider>
              </ApplicationAccessProvider>
            </ActionFeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Disables only automatic retries for deterministic failure scenarios, before child observers mount. */
function PrivateQueries({
  children,
  onClient,
}: PropsWithChildren<{ onClient(client: QueryClient): void }>) {
  const client = useQueryClient();
  useState(() => {
    client.setQueryDefaults([], { retry: false });
    return true;
  });
  useLayoutEffect(() => onClient(client), [client, onClient]);
  return children;
}

/** Makes public access failures deterministic without changing production Query defaults. */
export function consultationPublicClient() {
  const client = createQueryClient();
  client.setQueryDefaults([], { retry: false });
  return client;
}
