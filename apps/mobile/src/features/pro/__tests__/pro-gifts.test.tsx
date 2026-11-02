import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { useEffect } from "react";
import { Text } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import type { AccountSession } from "../../accounts";
import {
  AccountSessionProvider,
  useAccountSession,
} from "../../accounts/session/account-session-provider";
import { getAdvertisingEligibility } from "../../advertising/advertising-eligibility";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ProProfileEntry } from "../components/pro-profile-entry";
import { ProProvider, usePro, type ProContext } from "../pro-provider";
import * as proSessionModule from "../pro-session";
import { ProPresentationScreen } from "../screens/pro-presentation-screen";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import { v2Offering } from "../test-support/offering";
import { prepareProNativeIO } from "../test-support/pro-harness";
import { signInAccount } from "../test-support/sign-in-account";

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
// Provider content is native I/O: these markers prove host selection, never promotional rendering.
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: () => <Text>Native paywall</Text>,
      CustomerCenterView: () => <Text>Native management</Text>,
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
let pro: ProContext;
let client = createQueryClient();
const previousEnvironment = { ...process.env };
const accountId = "00000000-0000-4000-8000-000000000247";
beforeEach(() => {
  process.env.EXPO_PUBLIC_AUTH0_DOMAIN = "identity.example.invalid";
  process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID = "mobile-test";
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { v2: v2Offering } });
  client = createQueryClient();
});
afterEach(async () => {
  await cleanup();
  client.clear();
  jest.restoreAllMocks();
  process.env = { ...previousEnvironment };
});

/** Observes real F05/F09 owners and F11 eligibility with otherwise authorized ad inputs. */
function Journey() {
  useQueryClient().setQueryDefaults([], { retry: false, gcTime: Infinity });
  const a = useAccountSession();
  const p = usePro();
  useEffect(() => {
    account = a;
    pro = p;
  }, [a, p]);
  const advertising = getAdvertisingEligibility({
    account: a,
    pro: p.state,
    admission: { ordinary: true },
    choices: {
      session: { subject: a.subject, accountId: a.accountId },
      canRequestAds: true,
      authorizedMode: "limited",
    },
  });
  return (
    <ActionFeedbackProvider scopeKey={a.subject ?? "guest"}>
      <Text>Ads: {advertising.canServeAds ? "allowed" : "suppressed"}</Text>
      <Stack screenOptions={{ headerShown: false, animation: "none" }} />
    </ActionFeedbackProvider>
  );
}

/** Mounts real providers/navigation, establishes the account, then opens the actual Pro destination. */
async function openPro() {
  await renderRouter(
    {
      _layout: Journey,
      index: () => <ProProfileEntry />,
      pro: () => <ProPresentationScreen admitted />,
    },
    {
      initialUrl: "/",
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
  await act(() => signInAccount(account, accountId));
  await waitFor(() => expect(account.accountId).toBe(accountId));
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Blockout Pro" }));
}

/** Provides one synthetic native entitlement decision, without computing paid/promotional precedence. */
function sdkInfo(value: ReturnType<typeof entitlement>): CustomerInfo {
  return customerInfo({
    active: value.isActive ? { "Blockout Pro": value } : {},
    all: { "Blockout Pro": value },
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
}

it.each([
  {
    label: "temporary",
    expirationDate: "2026-02-01T00:00:00Z",
    expirationDateMillis: 1769904000000,
  },
  { label: "open-ended", expirationDate: null, expirationDateMillis: null },
])(
  "consumes SDK-active $label gift-only access without a billed renewal or paywall",
  async (validity) => {
    // Given: the temporary date is deliberately old; only the SDK decides whether access is active.
    const gift = entitlement({
      store: "PROMOTIONAL",
      productIdentifier:
        validity.label === "temporary"
          ? "rc_promo_Blockout Pro_custom"
          : "rc_promo_Blockout Pro_lifetime",
      isSandbox: false,
      willRenew: false,
      expirationDate: validity.expirationDate,
      expirationDateMillis: validity.expirationDateMillis,
    });
    mockPurchases.getCustomerInfo.mockResolvedValue(sdkInfo(gift));

    // When
    await openPro();

    // Then
    expect(await screen.findByText("Native management")).toBeOnTheScreen();
    expect(pro.state).toEqual({
      status: "active",
      entitlement: gift,
      operation: "idle",
    });
    expect(screen.getByText("Ads: suppressed")).toBeOnTheScreen();
    expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it.each(["expiry", "revocation"] as const)(
  "preserves SDK-active paid access after gift %s",
  async (ending) => {
    // Given: RevenueCat supplies a single active entitlement alongside an independent paid product.
    const gift = entitlement({
      store: "PROMOTIONAL",
      productIdentifier: "rc_promo_Blockout Pro_custom",
      isSandbox: false,
      willRenew: false,
      expirationDate: "2026-01-31T00:00:00Z",
      expirationDateMillis: 1769817600000,
    });
    const info: CustomerInfo = {
      ...sdkInfo(gift),
      activeSubscriptions: ["monthly"],
      allPurchasedProductIdentifiers: ["monthly", gift.productIdentifier],
      allExpirationDates: {
        monthly: "2026-02-01T00:00:00Z",
        [gift.productIdentifier]: gift.expirationDate,
      },
    };
    mockPurchases.getCustomerInfo.mockResolvedValue(info);
    await openPro();
    await screen.findByText("Native management");
    expect(screen.getByText("Ads: suppressed")).toBeOnTheScreen();
    expect(pro.state).toMatchObject({ status: "active", entitlement: gift });
    const paid = entitlement({ willRenew: false });
    const refreshed: CustomerInfo = {
      ...info,
      entitlements: sdkInfo(paid).entitlements,
      allExpirationDates: {
        monthly: "2026-02-01T00:00:00Z",
        [gift.productIdentifier]:
          ending === "expiry" ? "2026-01-31T00:00:00Z" : "2026-01-15T00:00:00Z",
      },
    };
    mockPurchases.getCustomerInfo.mockResolvedValue(refreshed);
    const listener =
      mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];

    // When: even an old promotional payload is just a signal for the current SDK read.
    await act(() => listener(info));

    // Then: disabled renewal still leaves the supplied paid period active; no extension is calculated.
    await waitFor(() =>
      expect(pro.state).toEqual({
        status: "active",
        entitlement: paid,
        operation: "idle",
      }),
    );
    expect(screen.getByText("Native management")).toBeOnTheScreen();
    expect(screen.getByText("Ads: suppressed")).toBeOnTheScreen();
    expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  },
);

it.each(["expiry", "revocation"] as const)(
  "accepts SDK-inactive gift-only %s without reviving purchase history",
  async (ending) => {
    // Given
    const gift = entitlement({
      store: "PROMOTIONAL",
      productIdentifier: "rc_promo_Blockout Pro_monthly",
      isSandbox: false,
      willRenew: false,
    });
    const info = sdkInfo(gift);
    mockPurchases.getCustomerInfo.mockResolvedValue(info);
    await openPro();
    await screen.findByText("Native management");
    const inactiveGift = entitlement({
      ...gift,
      isActive: false,
      expirationDate:
        ending === "expiry" ? "2026-02-01T00:00:00Z" : "2099-02-01T00:00:00Z",
      expirationDateMillis: ending === "expiry" ? 1769904000000 : 4073587200000,
    });
    mockPurchases.getCustomerInfo.mockResolvedValue({
      ...sdkInfo(inactiveGift),
      allPurchasedProductIdentifiers: [gift.productIdentifier],
      nonSubscriptionTransactions: [
        {
          transactionIdentifier: "synthetic-gift",
          productIdentifier: gift.productIdentifier,
          purchaseDate: gift.originalPurchaseDate,
          purchaseToken: null,
          originalJson: null,
          signature: null,
        },
      ],
    });
    const listener =
      mockPurchases.addCustomerInfoUpdateListener.mock.calls.at(-1)![0];

    // When
    await act(() => listener(info));

    // Then: F11 may resume ads only with the otherwise authorized choices supplied by Journey.
    expect(await screen.findByText("Native paywall")).toBeOnTheScreen();
    expect(pro.state).toEqual({ status: "inactive", operation: "idle" });
    expect(screen.getByText("Ads: allowed")).toBeOnTheScreen();
    expect(screen.queryByText("Native management")).not.toBeOnTheScreen();
  },
);

it("keeps unknown rights ad-free without an offer, then consumes a gift on explicit retry", async () => {
  // Given
  mockPurchases.getCustomerInfo.mockRejectedValue(new Error("unavailable"));
  await openPro();
  await screen.findByRole("alert");
  expect(pro.state.status).toBe("unavailable");
  expect(screen.getByText("Ads: suppressed")).toBeOnTheScreen();
  expect(screen.queryByText("Native paywall")).not.toBeOnTheScreen();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  const gift = entitlement({
    store: "PROMOTIONAL",
    productIdentifier: "rc_promo_Blockout Pro_monthly",
    isSandbox: false,
    willRenew: false,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(sdkInfo(gift));

  // When
  await userEvent
    .setup()
    .press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(await screen.findByText("Native management")).toBeOnTheScreen();
  expect(screen.getByText("Ads: suppressed")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});
