import * as proSessionModule from "../pro-session";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { ProProfileEntry } from "../components/pro-profile-entry";
import { ProProvider } from "../pro-provider";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { mockPurchases } from "../test-support/native-purchases";
import { v2Offering } from "../test-support/offering";

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
  const session = useAccountSession();
  useEffect(() => {
    account = session;
  }, [session]);
  return (
    <ActionFeedbackProvider scopeKey={session.generation}>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </ActionFeedbackProvider>
  );
}

/** Gives the profile an ordinary navigation exit while its offering read is pending. */
function ProfileRoute() {
  return (
    <>
      <ProProfileEntry />
      <Link href="/sporting">Quitter le profil</Link>
    </>
  );
}

it("keeps navigation usable during offering lookup and abandons the opening when profile loses focus", async () => {
  // Given
  const user = userEvent.setup();
  const read = Promise.withResolvers<PurchasesOfferings>();
  mockPurchases.getOfferings.mockReturnValueOnce(read.promise);
  try {
    await renderRouter(
      {
        _layout: JourneyLayout,
        profile: ProfileRoute,
        sporting: () => <Text>Sporting destination</Text>,
        pro: () => <Text>Pro destination</Text>,
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
      account.setAccount(
        account.generation,
        "00000000-0000-4000-8000-000000000251",
      ),
    );
    await screen.findByRole("button", {
      name: "Gérer ou restaurer mes achats",
    });

    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

    // Then
    expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
    expect(screen).toHavePathname("/profile");

    // When
    await user.press(screen.getByRole("link", { name: "Quitter le profil" }));

    // Then
    expect(await screen.findByText("Sporting destination")).toBeOnTheScreen();
    expect(screen).toHavePathname("/sporting");

    // When
    await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));
    await waitFor(() => expect(client.isFetching()).toBe(0));

    // Then
    expect(screen).toHavePathname("/sporting");
    expect(screen.queryByText("Pro destination")).not.toBeOnTheScreen();
  } finally {
    await act(() => read.resolve({ current: null, all: { v2: v2Offering } }));
  }
});
