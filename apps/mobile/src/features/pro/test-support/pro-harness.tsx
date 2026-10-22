import { Text } from "react-native";
import {
  useAccountSession,
  AccountSessionProvider,
} from "../../accounts/session/account-session-provider";
import type { AccountSession } from "../../accounts";
import {
  credentialsFor,
  mockClient,
} from "../../accounts/test-support/native-auth0";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import { ProVerification } from "../components/pro-verification";
import { customerInfo } from "./customer-info";
import { mockPurchases } from "./native-purchases";

/** Ordinary real-provider descendant; captured APIs expose actions without mocking their behavior. */
function Probe({ capture, onSupport }: ProHarnessProps) {
  const account = useAccountSession();
  const pro = usePro();
  capture(account, pro);
  return (
    <>
      <Text>Public sport</Text>
      <Text>Pro: {pro.state.status}</Text>
      <ProVerification onSupport={onSupport} />
    </>
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

/** Prepares synthetic credentials and native results; no HTTP establishment or provider is contacted. */
export function prepareProNativeIO() {
  jest.clearAllMocks();
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.mocked(initializeV2Installation).mockReset().mockResolvedValue();
  mockClient.credentialsManager.hasValidCredentials
    .mockReset()
    .mockResolvedValue(true);
  mockClient.credentialsManager.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|synthetic"));
  mockClient.credentialsManager.clearCredentials
    .mockReset()
    .mockResolvedValue();
  mockPurchases.isConfigured.mockReset().mockResolvedValue(true);
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
