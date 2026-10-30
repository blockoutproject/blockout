import { useEffect, type ReactNode, type ReactElement } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  ApplicationAccessProvider,
  useApplicationAccess,
} from "../../access/queries/use-application-access";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import { AccountFeedbackProvider } from "../../accounts/test-support/account-feedback-provider";

/** Shared provider fixture for count/recovery tests; scenarios retain ownership of all HTTP and native doubles. */
export function followingFixture() {
  const publicClient = createQueryClient();
  let client = publicClient;
  const clients = new Set([publicClient]);
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, gcTime: Infinity },
    mutations: { ...client.getDefaultOptions().mutations, gcTime: Infinity },
  });
  let session: AccountSession;
  let admission: ReturnType<typeof useApplicationAccess>;
  /** Exposes real owner APIs without replacing their lifecycle or Query behavior. */
  function Probe({ children }: { children: ReactNode }) {
    const current = useAccountSession();
    const access = useApplicationAccess();
    const privateClient = useQueryClient();
    privateClient.setDefaultOptions({
      queries: { retry: false },
      mutations: { networkMode: "always", retry: false, gcTime: Infinity },
    });
    useEffect(() => {
      clients.add(privateClient);
      client = privateClient;
      session = current;
      admission = access;
    }, [current, access, privateClient]);
    return children;
  }
  return {
    /** Clears every observed private cache and the public cache after React cleanup. */
    dispose() {
      for (const cache of clients) cache.clear();
      clients.clear();
    },
    get client() {
      return client;
    },
    get session() {
      return session;
    },
    get admission() {
      return admission;
    },
    /** Renders actual gesture, theme, account and admission owners around the feature under test. */
    render(children: ReactElement) {
      return render(children, {
        wrapper: ({ children }) => (
          <GestureHandlerRootView>
            <QueryClientProvider client={publicClient}>
              <ThemeProvider>
                <ApplicationAccessProvider>
                  <AccountSessionProvider>
                    <AccountFeedbackProvider>
                      <Probe>{children}</Probe>
                    </AccountFeedbackProvider>
                  </AccountSessionProvider>
                </ApplicationAccessProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </GestureHandlerRootView>
        ),
      });
    },
  };
}
