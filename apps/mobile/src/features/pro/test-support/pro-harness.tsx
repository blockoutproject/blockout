import { useQueryClient } from "@tanstack/react-query";
import { Text } from "react-native";
import {
  useAccountSession,
  AccountSessionProvider,
} from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProVerification } from "../components/pro-verification";
import { customerInfo } from "./customer-info";
import { mockPurchases } from "./native-purchases";

/** Ordinary real-provider descendant; captured APIs expose actions without mocking their behavior. */
function Probe({ capture, onSupport }: ProHarnessProps) {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const account = useAccountSession();
  const pro = usePro();
  capture(account, pro);
  return (
    <ActionFeedbackProvider scopeKey={account.subject ?? "guest"}>
      <Text>Public sport</Text>
      <Text>Pro: {pro.state.status}</Text>
      <ProVerification onSupport={onSupport} />
    </ActionFeedbackProvider>
  );
}
/** Captures current public APIs; the support destination remains a navigation double. */
export interface ProHarnessProps {
  capture(account: AccountSession, pro: ProContext): void;
  onSupport(): void;
}
/** Real F05, F09 and F13 providers; suites explicitly install native I/O mocks. */
export function ProHarness(props: ProHarnessProps) {
  return (
    <ThemeProvider>
      <AccountSessionProvider>
        <ProProvider>
          <Probe {...props} />
        </ProProvider>
      </AccountSessionProvider>
    </ThemeProvider>
  );
}
/** Resets the explicitly installed native I/O doubles to synthetic authenticated and inactive defaults. */
export function prepareProNativeIO() {
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  let configured = false;
  mockPurchases.configure.mockReset().mockImplementation(() => {
    configured = true;
  });
  mockPurchases.isConfigured
    .mockReset()
    .mockImplementation(async () => configured);
  mockPurchases.isAnonymous.mockReset().mockResolvedValue(false);
  const info = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(info);
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: info, created: false });
  mockPurchases.logOut.mockReset().mockResolvedValue(info);
  return info;
}
