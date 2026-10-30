import { useEffect, type ReactNode, type ReactElement } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
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
  const client = createQueryClient();
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
    useEffect(() => {
      session = current;
      admission = access;
    }, [current, access]);
    return children;
  }
  return {
    client,
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
            <QueryClientProvider client={client}>
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
