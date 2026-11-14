import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { getMockContext, renderRouter } from "expo-router/testing-library";
import { useEffect, type ComponentProps, type ComponentType } from "react";
import RevenueCatUI from "react-native-purchases-ui";
import OrdinaryLayout from "@/app/(ordinary)/_layout";
import { applicationAccessResponse } from "@/shared/api/test-support/application-access";
import { useAccountSession } from "@/features/accounts/current-account";
import { useCurrentAccount } from "@/features/accounts/api/use-current-account";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import type { CustomerInfo } from "react-native-purchases";
import { accountResponse } from "@/features/accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { submitAgeDeclaration } from "@/features/advertising/age-declaration";
import { nativeAdvertising } from "@/features/advertising/test-support/native-privacy";
import { controlledInterstitial } from "@/features/advertising/test-support/interstitial";
import { usePro } from "../../pro";
import * as proSessionModule from "../../pro/pro-session";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import { defaultOffering } from "../../pro/test-support/offering";
import { completeDiscovery } from "@/features/onboarding/discovery-state";

jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  return {
    ...actual,
    __esModule: true,
    default: {
      ...actual.default,
      expoConfig: {
        ...actual.default.expoConfig,
        extra: {
          ...actual.default.expoConfig?.extra,
          revenueCat: {
            iosApiKey: "test_public",
            offeringIdentifier: "default",
          },
          advertising: {
            iosInterstitialUnitId: "synthetic-unit",
            androidInterstitialUnitId: "synthetic-unit",
          },
        },
      },
    },
  };
});
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
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../../pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("react-native-purchases-ui", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    __esModule: true,
    default: {
      Paywall: (props: ComponentProps<typeof RevenueCatUI.Paywall>) => {
        mockPaywall = props;
        return <Text>Native store offer</Text>;
      },
    },
  };
});
jest.mock("react-native-google-mobile-ads", () => ({
  ...jest.requireActual("@/features/advertising/test-support/native-privacy")
    .nativeAdvertising,
  default: () => mockMobileAds,
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn(() => mockCreateAd()) },
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

const mockCreateAd = jest.fn(controlledInterstitial);
const mockMobileAds = {
  setRequestConfiguration: jest.fn().mockResolvedValue(undefined),
  initialize: jest.fn().mockResolvedValue([]),
};
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
let mockPaywall: ComponentProps<typeof RevenueCatUI.Paywall>;
let owners: {
  session: ReturnType<typeof useAccountSession>;
  account: ReturnType<typeof useCurrentAccount>;
  pro: ReturnType<typeof usePro>;
  client: ReturnType<typeof useQueryClient>;
};
const environment = { ...process.env };
const initializationMarker = "blockout:v2-initialized";
const newUuid = "00000000-0000-4000-8000-000000000338";
const replacementUuid = "00000000-0000-4000-8000-000000000339";
let mockAccount: AccountResponse;
let mockAccountExists: boolean;

beforeEach(async () => {
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  await AsyncStorage.setItem(initializationMarker, "true");
  await completeDiscovery();
  await submitAgeDeclaration(18);
  mockAccount = accountResponse({
    accountId: newUuid,
    username: "Fresh_profile",
    email: "shared@example.invalid",
  });
  mockAccountExists = false;
  // Each case starts a real process owner; remounts inside a case retain its SDK lifecycle.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  mockAuth0.hasValidAuth0InstanceWithConfiguration
    .mockReset()
    .mockResolvedValue(true);
  mockAuth0.clearCredentials.mockReset().mockImplementation(async () => {
    mockAuth0.hasValidCredentials.mockResolvedValue(false);
    mockAuth0.getCredentials.mockRejectedValue({
      code: "no_credentials",
      message: "No credentials",
    });
  });
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockReset();
  mockAuth0.saveCredentials
    .mockReset()
    .mockImplementation(async (credentials) => {
      mockAuth0.hasValidCredentials.mockResolvedValue(true);
      mockAuth0.getCredentials.mockResolvedValue(credentials);
    });
  mockAuth0.webAuthLogout.mockReset().mockResolvedValue();
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  let configured = false;
  mockPurchases.configure.mockReset().mockImplementation(() => {
    configured = true;
  });
  mockPurchases.isConfigured
    .mockReset()
    .mockImplementation(async () => configured);
  mockPurchases.isAnonymous.mockReset().mockResolvedValue(false);
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: inactive, created: false });
  mockPurchases.logOut.mockReset().mockResolvedValue(inactive);
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(inactive);
  mockPurchases.restorePurchases.mockReset().mockResolvedValue(inactive);
  mockPurchases.getOfferings
    .mockReset()
    .mockResolvedValue({ current: null, all: { default: defaultOffering } });
  mockCreateAd.mockReset().mockImplementation(controlledInterstitial);
  mockMobileAds.initialize.mockClear();
  mockMobileAds.setRequestConfiguration.mockClear();
  nativeAdvertising.AdsConsent.requestInfoUpdate.mockClear();
  nativeAdvertising.AdsConsent.loadAndShowConsentFormIfRequired.mockClear();
  mockFetch.mockReset().mockImplementation(async (url, options) => {
    if (String(url).endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (String(url).endsWith("/accounts") && options?.method === "POST") {
      mockAccountExists = true;
      return Response.json(mockAccount, { status: 201 });
    }
    if (String(url).endsWith("/accounts/me")) {
      return mockAccountExists
        ? Response.json(mockAccount)
        : new Response(null, { status: 404 });
    }
    if (
      String(url).endsWith(`/accounts/${mockAccount.accountId}`) &&
      options?.method === "DELETE"
    ) {
      mockAccountExists = false;
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected HTTP boundary: ${String(url)}`);
  });
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.useRealTimers();
  process.env = { ...environment };
});

/** Captures real public owner APIs without replacing any route content or derived behavior. */
function OwnerObservation() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const pro = usePro();
  const client = useQueryClient();
  useEffect(() => {
    owners = { session, account, pro, client };
  });
  return null;
}

/** Keeps the production ordinary navigator and adds a passive observer for cross-subject commands. */
function ObservedOrdinaryLayout() {
  return (
    <>
      <OwnerObservation />
      <OrdinaryLayout />
    </>
  );
}

/** Mounts production routes, root providers, hooks and clients; only HTTP, storage and native SDK I/O are controlled. */
async function openInstallation(initialUrl = "/") {
  const context = getMockContext({
    appDir: "src/app",
    overrides: { "(ordinary)/_layout": ObservedOrdinaryLayout },
  });
  return renderRouter(
    // Memory contexts restore special-file extensions stripped by filesystem overrides.
    Object.fromEntries(context.keys().map((key) => [key, context(key)])),
    { initialUrl },
  );
}

/** Supplies native login I/O; the scenario still presses the real F05 sign-in action. */
function prepareLogin(subject: string) {
  const credentials = credentialsFor(subject);
  mockAuth0.getCredentials.mockResolvedValue(credentials);
  mockAuth0.webAuth.mockImplementation(async () => {
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    return credentials;
  });
}

/** Creates explicit native evidence; dates, cache and store ownership remain SDK responsibilities. */
function rights(
  store: "APP_STORE" | "PLAY_STORE" | "PROMOTIONAL",
): CustomerInfo {
  const active = { "Blockout Pro": entitlement({ store }) };
  return customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
}

it.each(["APP_STORE", "PLAY_STORE", "PROMOTIONAL"] as const)(
  "reads current %s rights for the new business UUID after explicit sign-in without restoration",
  async (store) => {
    // Given
    prepareLogin("google-oauth2|retained");
    // A historical RevenueCat reference does not select the SDK's current customer.
    const current = {
      ...rights(store),
      originalAppUserId: "auth0|historical-customer",
    };
    mockPurchases.getCustomerInfo.mockResolvedValue(current);
    const user = userEvent.setup();
    await openInstallation("/sign-in");
    expect(mockPurchases.configure).not.toHaveBeenCalled();

    // When
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );

    // Then
    expect(await screen.findByText("Fresh_profile")).toBeOnTheScreen();
    await waitFor(() => expect(owners.pro.state.status).toBe("active"));
    expect(owners.session.subject).toBe("google-oauth2|retained");
    expect(owners.session.accountId).toBe(newUuid);
    expect(mockPurchases.configure).toHaveBeenCalledWith(
      expect.objectContaining({ appUserID: newUuid }),
    );
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
  },
);

it("keeps two unlinked principals with equal emails in distinct account and entitlement lifetimes", async () => {
  // Given
  prepareLogin("google-oauth2|a");
  mockPurchases.getCustomerInfo.mockResolvedValue(rights("PROMOTIONAL"));
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await waitFor(() => expect(owners.pro.state.status).toBe("active"));
  const originalClient = owners.client;

  // When
  await user.press(screen.getByRole("button", { name: "Se déconnecter" }));
  await waitFor(() => expect(owners.session.status).toBe("guest"));
  expect(owners.pro.state.status).toBe("guest");
  mockAccount = accountResponse({
    accountId: replacementUuid,
    username: "Separate_profile",
    email: "shared@example.invalid",
  });
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.logIn.mockResolvedValue({
    customerInfo: inactive,
    created: false,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(inactive);
  prepareLogin("apple|b");
  await act(() => router.push("/sign-in"));
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));

  // Then
  expect(await screen.findByText("Separate_profile")).toBeOnTheScreen();
  await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));
  expect(owners.session.accountId).toBe(replacementUuid);
  expect(owners.client).not.toBe(originalClient);
  expect(owners.account.data?.email).toBe("shared@example.invalid");
  expect(mockPurchases.logIn).toHaveBeenLastCalledWith(replacementUuid);
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(nativeAdvertising.AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(
    1,
  );
});

it("keeps missing-email establishment unusable until an explicit account retry without another hosted login", async () => {
  // Given
  prepareLogin("apple|no-email");
  mockFetch.mockImplementation(async (url) => {
    if (String(url).endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    return Response.json(
      String(url).endsWith("/accounts")
        ? {
            type: "urn:blockout:problem:provider-email-unavailable",
            title: "Unavailable",
            status: 422,
          }
        : {
            type: "urn:blockout:problem:not-found",
            title: "Not found",
            status: 404,
          },
      {
        status: String(url).endsWith("/accounts") ? 422 : 404,
        headers: { "Content-Type": "application/problem+json" },
      },
    );
  });
  const user = userEvent.setup();
  await openInstallation("/sign-in");

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await act(async () => jest.advanceTimersByTimeAsync(7500));
  await screen.findByRole("alert", {
    name: "Impossible de charger votre compte",
  });

  // Then
  expect(owners.session.status).toBe("authenticated");
  expect(owners.session.accountId).toBeNull();
  expect(mockPurchases.configure).not.toHaveBeenCalled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();

  expect(screen).toHavePathname("/profile");
  expect(
    screen.getByRole("button", { name: "Créer mon compte" }),
  ).toBeEnabled();
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(1);

  // When
  mockFetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/application-access")) {
      return Response.json(applicationAccessResponse());
    }
    if (String(url).endsWith("/accounts") && options?.method === "POST") {
      mockAccountExists = true;
    }
    return mockAccountExists
      ? Response.json(mockAccount)
      : Response.json(
          {
            type: "urn:blockout:problem:not-found",
            title: "Not found",
            status: 404,
          },
          {
            status: 404,
            headers: { "Content-Type": "application/problem+json" },
          },
        );
  });
  await user.press(screen.getByRole("button", { name: "Créer mon compte" }));

  // Then
  expect(await screen.findByText("Fresh_profile")).toBeOnTheScreen();
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(([, options]) => options?.method === "POST"),
  ).toHaveLength(2);
  expect(mockPurchases.configure).toHaveBeenCalledWith(
    expect.objectContaining({ appUserID: newUuid }),
  );
});

it("keeps an outage unknown while the explicit paywall and independent private assistance remain available", async () => {
  // Given
  prepareLogin("apple|retained");
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("Native state unavailable"),
  );
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await screen.findByText("Fresh_profile");
  await waitFor(() =>
    expect(owners.pro.state).toMatchObject({
      status: "unavailable",
      reason: "customer-info",
    }),
  );
  const adRequests = mockCreateAd.mock.calls.length;

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(await screen.findByText("Native store offer")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(mockCreateAd).toHaveBeenCalledTimes(adRequests);

  // When
  await act(() => mockPaywall.onDismiss?.());
  await user.press(screen.getByRole("button", { name: "Besoin d’aide ?" }));

  // Then
  expect(await screen.findByLabelText("Titre")).toBeOnTheScreen();
  expect(screen).toHavePathname("/support");
  expect(screen.getByLabelText("E-mail de réponse")).toHaveDisplayValue(
    "shared@example.invalid",
  );
});

it.each(["APP_STORE", "PLAY_STORE"] as const)(
  "restores only the explicit native %s result on a recreated UUID without reviving a gift",
  async (store) => {
    // Given
    prepareLogin("google-oauth2|surviving");
    mockPurchases.getCustomerInfo.mockResolvedValue(rights("PROMOTIONAL"));
    mockAccount.permissions.manageMaintenance = true;
    const user = userEvent.setup();
    await openInstallation("/sign-in");
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );
    await waitFor(() => expect(owners.pro.state.status).toBe("active"));
    const oldClient = owners.client;
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );
    await user.press(await screen.findByRole("checkbox"));

    // When
    await user.press(
      screen.getByRole("button", { name: "Supprimer mon compte" }),
    );
    await waitFor(() => expect(owners.session.status).toBe("guest"));
    expect(owners.pro.state.status).toBe("guest");
    mockAccount = accountResponse({
      accountId: replacementUuid,
      username: "Recreated_profile",
      email: "shared@example.invalid",
    });
    const inactive = customerInfo({
      active: {},
      all: {},
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    mockPurchases.logIn.mockResolvedValue({
      customerInfo: inactive,
      created: false,
    });
    mockPurchases.getCustomerInfo.mockResolvedValue(inactive);
    await act(() => router.push("/sign-in"));
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );
    await screen.findByText("Recreated_profile");
    await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));

    // Then
    expect(owners.client).not.toBe(oldClient);
    expect(owners.account.data?.permissions.manageMaintenance).toBe(false);
    expect(mockPurchases.logIn).toHaveBeenLastCalledWith(replacementUuid);
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
    expect(
      mockFetch.mock.calls
        .filter(([, options]) => options?.method === "DELETE")
        .map(([url]) => String(url)),
    ).toEqual([`https://api.example.invalid/accounts/${newUuid}`]);

    // When
    await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
    await screen.findByText("Native store offer");
    const paid = rights(store);
    await act(() => mockPaywall.onRestoreCompleted?.({ customerInfo: paid }));

    // Then
    await waitFor(() =>
      expect(owners.pro.state).toMatchObject({
        status: "active",
        entitlement: { store },
      }),
    );
    expect(owners.session.accountId).toBe(replacementUuid);
    expect(owners.account.data?.username).toBe("Recreated_profile");
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it("consumes a native restoration failure without replay or a verification prerequisite", async () => {
  // Given
  prepareLogin("apple|retained");
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await screen.findByText("Fresh_profile");
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native store offer");

  // When
  await act(() =>
    mockPaywall.onRestoreError?.({
      error: {
        code: mockPurchases.PURCHASES_ERROR_CODE.NETWORK_ERROR,
        message: "Private native error",
        readableErrorCode: "NETWORK_ERROR",
        underlyingErrorMessage: "",
        userCancelled: false,
        userInfo: { readableErrorCode: "NETWORK_ERROR" },
      },
    }),
  );

  // Then
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Vérifier mes droits" }),
  ).toBeNull();
  expect(screen.getByText("Native store offer")).toBeOnTheScreen();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(owners.pro.state).toMatchObject({
    status: "inactive",
    operation: "failed",
  });
});

it("keeps native pending payment separate from inactive rights after transition sign-in", async () => {
  // Given
  prepareLogin("apple|retained");
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await screen.findByText("Fresh_profile");
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native store offer");

  // When
  await act(() =>
    mockPaywall.onPurchaseError!({
      error: {
        code: mockPurchases.PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR,
        message: "Store pending",
        readableErrorCode: "PAYMENT_PENDING_ERROR",
        underlyingErrorMessage: "Store pending",
        userCancelled: false,
        userInfo: { readableErrorCode: "PAYMENT_PENDING_ERROR" },
      },
    }),
  );

  // Then
  expect(screen.getByText("Native store offer")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Vérifier mes droits" }),
  ).toBeNull();
  expect(owners.pro.state).toMatchObject({
    status: "inactive",
    operation: "pending",
  });
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});

it("consumes an empty native restore without activating Pro or announcing expiry", async () => {
  // Given
  prepareLogin("apple|retained");
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await screen.findByText("Fresh_profile");
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native store offer");
  const inactive = customerInfo({
    active: {},
    all: {},
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  const reads = mockPurchases.getCustomerInfo.mock.calls.length;

  // When
  await act(() => mockPaywall.onRestoreCompleted?.({ customerInfo: inactive }));

  // Then
  expect(owners.pro.state).toMatchObject({
    status: "inactive",
    operation: "restored",
  });
  expect(screen.queryByText(/Pro actif|expiré/)).toBeNull();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(reads);
});

it("reads current revoked rights after an old active listener signal without replaying restoration", async () => {
  // Given
  prepareLogin("google-oauth2|retained");
  const previouslyActive = rights("APP_STORE");
  mockPurchases.getCustomerInfo.mockResolvedValue(previouslyActive);
  const user = userEvent.setup();
  await openInstallation("/sign-in");
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await waitFor(() => expect(owners.pro.state.status).toBe("active"));
  const inactive = customerInfo({
    active: {},
    all: { "Blockout Pro": entitlement({ isActive: false, willRenew: false }) },
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(inactive);
  const listeners = mockPurchases.addCustomerInfoUpdateListener.mock.calls;
  const listener = listeners[listeners.length - 1][0];

  // When
  await act(() => listener(previouslyActive));

  // Then
  await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));
  expect(owners.session.accountId).toBe(newUuid);
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});
