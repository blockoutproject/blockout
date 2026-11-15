import { accountResponse as mockAccountResponse } from "@/features/accounts/test-support/account-response";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { fetch } from "expo/fetch";
import * as proSessionModule from "../pro-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { useEffect, type ComponentType } from "react";
import { Appearance, Text } from "react-native";
import RootLayout from "@/app/_layout";
import { useAccountSession } from "@/features/accounts/session/account-session-provider";
import type { AccountSession } from "@/features/accounts";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { useTheme } from "@/shared/theme/theme-provider";
import {
  appearanceColors,
  membershipColors,
  neutralContext,
} from "@/shared/theme/tokens";
import { usePro } from "../index";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { prepareProNativeIO } from "../test-support/pro-harness";

jest.unmock("react-native/Libraries/Utilities/useColorScheme");
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  Stack: jest.fn(),
  // This theme-owner suite replaces the navigator; notification events control their navigation boundary separately.
  useRootNavigationState: () => ({ key: "synthetic-root" }),
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
const a = "00000000-0000-4000-8000-000000000001";
let mockAccountId: string | undefined;
let account: AccountSession;
const originalDomain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
const originalClient = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
beforeEach(async () => {
  mockAccountId = undefined;
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  // A fresh real owner isolates tests; remounts within one scenario retain it.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  await AsyncStorage.clear();
  prepareProNativeIO();
  // Usable UUIDs are explicitly published through F05 below; no backend is contacted.
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  jest
    .mocked(fetch)
    .mockReset()
    .mockImplementation(async (url) => {
      if (String(url).endsWith("/accounts/me") && mockAccountId !== undefined) {
        return Response.json(
          mockAccountResponse({
            accountId: mockAccountId,
          }),
        ) as Awaited<ReturnType<typeof fetch>>;
      }
      return (
        String(url).endsWith("/application-access")
          ? Response.json(applicationAccessResponse())
          : new Response(null, { status: 404 })
      ) as Awaited<ReturnType<typeof fetch>>;
    });
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
  jest.mocked(Stack).mockImplementation(AppearanceRoute);
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  if (originalDomain === undefined) {
    delete process.env.EXPO_PUBLIC_AUTH0_DOMAIN;
  } else {
    process.env.EXPO_PUBLIC_AUTH0_DOMAIN = originalDomain;
  }
  if (originalClient === undefined) {
    delete process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID;
  } else {
    process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = originalClient;
  }
  if (originalApiUrl === undefined) {
    delete process.env.EXPO_PUBLIC_API_URL;
  } else {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  }
});

/** Reads public presentation contracts; text exposes semantic values without style assertions. */
function AppearanceValues() {
  const theme = useTheme();
  return (
    <>
      <Text accessibilityLabel="Apparence">{theme.scheme}</Text>
      <Text accessibilityLabel="Accent Pro">{theme.membership.fill}</Text>
      <Text accessibilityLabel="Contexte sportif">{theme.context.primary}</Text>
      <Text accessibilityLabel="Fond neutre">{theme.colors.canvas}</Text>
    </>
  );
}

/** Reads the root composition while its Query, Auth0/session, Pro and theme owners stay real. */
function AppearanceRoute() {
  const currentAccount = useAccountSession();
  const currentPro = usePro();
  useEffect(() => {
    account = currentAccount;
  }, [currentAccount, currentPro]);
  return (
    <>
      <AppearanceValues />
      <Text>Pro: {currentPro.state.status}</Text>
    </>
  );
}

/** Mounts only the real owners; each scenario publishes and awaits its account explicitly. */
async function renderAccount() {
  await render(<RootLayout />);
}

/** Builds only synthetic SDK evidence; the provider's active map remains authoritative. */
function activeInfo(store: "APP_STORE" | "PROMOTIONAL" = "APP_STORE") {
  const active = { "Blockout Pro": entitlement({ store }) };
  return customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
}

it("applies current Pro presentation at the root and removes it on sign-out", async () => {
  // Given
  await renderAccount();
  await waitFor(() => expect(account.status).toBe("authenticated"));
  mockAccountId = a;
  mockAuth0.webAuth.mockResolvedValue(credentialsFor(`auth0|${a}`));
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor(`auth0|${a}`));
  mockAuth0.saveCredentials.mockResolvedValue();
  await act(() => account.signIn("https://api.example.invalid"));
  await waitFor(() => expect(account.accountId).toBe(a));
  await screen.findByText("Pro: inactive");
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
  mockPurchases.getCustomerInfo.mockResolvedValueOnce(activeInfo());

  // When
  await act(() => proSessionModule.proSession.refresh(account));

  // Then
  expect(screen.getByText("Pro: active")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.pro.light.fill,
  );
  expect(screen.getByLabelText("Contexte sportif")).toHaveTextContent(
    neutralContext.light.primary,
  );
  expect(screen.getByLabelText("Fond neutre")).toHaveTextContent(
    appearanceColors.light.canvas,
  );

  // When
  await act(() => account.clearCredentials());

  // Then
  expect(screen.getByText("Pro: guest")).toBeOnTheScreen();
  expect(screen.getByLabelText("Accent Pro")).toHaveTextContent(
    membershipColors.light.fill,
  );
});
