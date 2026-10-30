import { useQueryClient, QueryClientProvider } from "@tanstack/react-query";
import { signInAccount } from "../test-support/sign-in-account";
import * as proSessionModule from "../pro-session";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Link, Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import { useEffect } from "react";
import type { PurchasesOfferings } from "react-native-purchases";
import {
  AccountSessionProvider,
  useAccountSession,
  type AccountSession,
} from "../../accounts/session/account-session-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ProPresentationScreen } from "../screens/pro-presentation-screen";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { ProProvider } from "../pro-provider";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { v2Offering } from "../test-support/offering";

jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        revenueCat: { iosApiKey: "test_public", offeringIdentifier: "v2" },
      },
    },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: () => <Text>Native paywall double</Text>,
      CustomerCenterView: () => <Text>Native management double</Text>,
    },
  };
});
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
let account: AccountSession;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  client = createQueryClient();
  mockPurchases.getOfferings.mockReset();
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});
/** Keeps the real account and Pro owners alive while the Router changes focus. */
function JourneyLayout() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const session = useAccountSession();
  useEffect(() => {
    account = session;
  }, [session]);
  return (
    <ActionFeedbackProvider scopeKey={session.subject ?? "guest"}>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </ActionFeedbackProvider>
  );
}
/** The profile entry navigates before any offering lookup. */
function ProfileRoute() {
  return (
    <>
      <ProProfileEntry />
      <Link href="/sporting">Quitter le profil</Link>
    </>
  );
}
it("opens Pro immediately and discards a late offer after the destination loses its owner", async () => {
  // Given: real Router and providers; only SDK I/O and native provider UI are controlled.
  const user = userEvent.setup();
  const read = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(read.promise);
  try {
    await renderRouter(
      {
        _layout: JourneyLayout,
        profile: ProfileRoute,
        sporting: () => <Text>Sporting destination</Text>,
        pro: () => <ProPresentationScreen admitted />,
      },
      {
        initialUrl: "/profile",
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>
            <ThemeProvider>
              <AccountSessionProvider>
                <ProProvider>{children}</ProProvider>
              </AccountSessionProvider>
            </ThemeProvider>
          </QueryClientProvider>
        ),
      },
    );
    await waitFor(() => expect(account.status).toBe("authenticated"));
    await act(() =>
      signInAccount(account, "00000000-0000-4000-8000-000000000251"),
    );
    await waitFor(() =>
      expect(account.accountId).toBe("00000000-0000-4000-8000-000000000251"),
    );
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    // Then
    expect(screen).toHavePathname("/pro");
    expect(await screen.findByRole("progressbar")).toBeOnTheScreen();
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
    // When
    await user.press(screen.getByRole("button", { name: "Retour" }));
    await user.press(screen.getByRole("link", { name: "Quitter le profil" }));
    await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    // Then
    expect(screen).toHavePathname("/sporting");
    expect(screen.getByText("Sporting destination")).toBeOnTheScreen();
    expect(screen.queryByText("Native paywall double")).not.toBeOnTheScreen();
  } finally {
    await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));
  }
});
