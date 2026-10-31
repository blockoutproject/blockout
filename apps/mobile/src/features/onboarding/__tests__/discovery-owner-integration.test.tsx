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
import { renderRouter } from "expo-router/testing-library";
import { useEffect, type ComponentProps, type ComponentType } from "react";
import RevenueCatUI from "react-native-purchases-ui";
import OrdinaryLayout from "../../../app/(ordinary)/_layout";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { useAccountSession } from "../../accounts/current-account";
import { useCurrentAccount } from "../../accounts/api/use-current-account";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import {
  readAgeDeclaration,
  submitAgeDeclaration,
} from "../../advertising/age-declaration";
import { nativeAdvertising } from "../../advertising/test-support/native-privacy";
import { usePro } from "../../pro";
import * as proSessionModule from "../../pro/pro-session";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import { v2Offering } from "../../pro/test-support/offering";
import { completeDiscovery, readDiscoveryCompletion } from "../discovery-state";

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
          revenueCat: { iosApiKey: "test_public", offeringIdentifier: "v2" },
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
    "../../accounts/test-support/native-auth0",
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
      CustomerCenterView: () => <Text>Native purchase management</Text>,
    },
  };
});
jest.mock("react-native-google-mobile-ads", () => ({
  ...jest.requireActual("../../advertising/test-support/native-privacy")
    .nativeAdvertising,
  default: () => mockMobileAds,
}));
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

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

beforeEach(async () => {
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  // Each case starts a real process owner; remounts inside a case retain its SDK lifecycle.
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  mockAuth0.hasValidAuth0InstanceWithConfiguration
    .mockReset()
    .mockResolvedValue(true);
  mockAuth0.clearCredentials.mockReset().mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockAuth0.getCredentials
    .mockReset()
    .mockResolvedValue(credentialsFor("auth0|a"));
  mockAuth0.webAuth.mockReset();
  mockAuth0.saveCredentials.mockReset().mockResolvedValue();
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
    .mockResolvedValue({ current: null, all: { v2: v2Offering } });
  mockMobileAds.initialize.mockClear();
  mockMobileAds.setRequestConfiguration.mockClear();
  nativeAdvertising.AdsConsent.gatherConsent.mockClear();
  mockFetch.mockReset().mockImplementation(async (url, options) => {
    if (String(url).endsWith("/application-access"))
      return Response.json(applicationAccessResponse());
    if (String(url).endsWith("/accounts") && options?.method === "POST")
      return Response.json(accountResponse(), { status: 201 });
    if (String(url).includes("/accounts/me"))
      return Response.json(accountResponse());
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
  return renderRouter(
    {
      appDir: "src/app",
      overrides: { "(ordinary)/_layout": ObservedOrdinaryLayout },
    },
    { initialUrl },
  );
}

it("restores ordinary personal access on later launches after explicit first-V2 sign-in", async () => {
  // Given
  mockAuth0.webAuth.mockImplementation(async () => {
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    return credentialsFor("auth0|a");
  });
  const user = userEvent.setup();
  const first = await openInstallation();
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await screen.findByText("Original");
  expect(
    mockFetch.mock.calls.filter(
      ([url, options]) =>
        String(url).endsWith("/accounts") && options?.method === "POST",
    ),
  ).toHaveLength(1);
  await first.unmount();
  await openInstallation("/profile");

  // Then
  expect(await screen.findByText("Original")).toBeOnTheScreen();
  expect(owners.session.status).toBe("authenticated");
  expect(mockAuth0.webAuth).toHaveBeenCalledTimes(1);
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
  expect(
    mockFetch.mock.calls.filter(
      ([url, options]) =>
        String(url).endsWith("/accounts") && options?.method === "POST",
    ),
  ).toHaveLength(1);
  expect(await AsyncStorage.getItem(initializationMarker)).toBe("true");
  expect(await readDiscoveryCompletion()).toBe(true);
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});

it("treats SDK-expired rights as inactive while unknown verification has no free-account or offer evidence", async () => {
  // Given
  await AsyncStorage.setItem(initializationMarker, "true");
  await completeDiscovery();
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  const expired = customerInfo({
    active: {},
    all: {
      "Blockout Pro": entitlement({
        isActive: false,
        willRenew: false,
        expirationDate: "2020-01-01T00:00:00Z",
        expirationDateMillis: 1577836800000,
      }),
    },
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(expired);
  const user = userEvent.setup();

  // When
  await openInstallation("/profile");

  // Then
  expect(await screen.findByText("Compte gratuit")).toBeOnTheScreen();
  expect(owners.pro.state.status).toBe("inactive");
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(await screen.findByText("Native store offer")).toBeOnTheScreen();
  expect(mockPurchases.getOfferings).toHaveBeenCalledTimes(1);
});

it("keeps unknown Pro rights out of free/expired presentation, ads and offers while retaining explicit restoration and real assistance", async () => {
  // Given
  await AsyncStorage.setItem(initializationMarker, "true");
  await completeDiscovery();
  await submitAgeDeclaration(18);
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("Native verification unavailable"),
  );
  const user = userEvent.setup();
  await openInstallation("/profile");
  await screen.findByText("Original");
  await waitFor(() =>
    expect(owners.pro.state).toMatchObject({
      status: "unavailable",
      reason: "customer-info",
    }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByText(/Compte gratuit|expiré|Native store offer/),
  ).toBeNull();
  expect(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  ).toBeEnabled();
  expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  expect(mockMobileAds.initialize).not.toHaveBeenCalled();

  // When
  await user.press(
    screen.getByRole("button", { name: "Restaurer mes achats" }),
  );

  // Then
  expect(
    await screen.findByText(/Restauration terminée\. Aucun droit Pro actif/),
  ).toBeOnTheScreen();
  expect(mockPurchases.restorePurchases).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Native store offer")).toBeNull();

  // When
  await user.press(
    screen.getByRole("button", { name: "Contacter l’assistance" }),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Assistance et suggestions" }),
  ).toBeOnTheScreen();
  expect(screen.getByLabelText("Titre")).toBeOnTheScreen();
  expect(screen.getByLabelText("E-mail de réponse")).toHaveDisplayValue(
    "owner@example.invalid",
  );
});

it.each([
  ["cancelled", "a0.session.user_cancelled", "Connexion annulée."],
  ["failed", "a0.network_error", TECHNICAL_ERROR],
] as const)(
  "opens real assistance after skipped discovery and %s sign-in without declaring an age",
  async (_outcome, code, message) => {
    // Given
    mockAuth0.webAuth.mockRejectedValue({
      code,
      message: "Synthetic native failure",
    });
    const user = userEvent.setup();
    await openInstallation();
    await user.press(await screen.findByRole("button", { name: "Passer" }));
    await user.press(
      await screen.findByRole("button", { name: "Se connecter" }),
    );
    await screen.findByText(message);

    // When
    await user.press(screen.getByRole("link", { name: "Besoin d’aide ?" }));
    await user.type(
      await screen.findByLabelText("Titre"),
      "Connexion impossible",
    );
    await user.type(
      screen.getByLabelText("Description"),
      "Demande de démonstration",
    );

    // Then
    expect(screen.getByLabelText("Titre")).toHaveDisplayValue(
      "Connexion impossible",
    );
    expect(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    ).toBeOnTheScreen();
    expect(await readAgeDeclaration()).toBeNull();
    expect(await readDiscoveryCompletion()).toBe(true);
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it("retains real assistance when explicit sign-in succeeds but the business profile is unavailable", async () => {
  // Given
  jest.useFakeTimers();
  mockAuth0.webAuth.mockImplementation(async () => {
    mockAuth0.hasValidCredentials.mockResolvedValue(true);
    return credentialsFor("auth0|a");
  });
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : Response.json(
          {
            type: "urn:blockout:problem:internal-error",
            title: "Unavailable",
            status: 500,
          },
          { status: 500 },
        ),
  );
  const user = userEvent.setup();
  await openInstallation();
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // When
  await user.press(await screen.findByRole("button", { name: "Se connecter" }));
  await act(async () => jest.advanceTimersByTimeAsync(7500));
  await screen.findByRole("header", { name: "Mon profil" });
  await act(async () => jest.advanceTimersByTimeAsync(7500));

  // Then
  expect(
    await screen.findByRole("alert", { name: "Une erreur est survenue" }),
  ).toBeOnTheScreen();
  expect(owners.session.status).toBe("authenticated");
  expect(owners.session.accountId).toBeNull();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();

  // When
  await user.press(screen.getByRole("button", { name: "Besoin d’aide ?" }));

  // Then
  expect(await screen.findByLabelText("Titre")).toBeOnTheScreen();
  expect(
    screen.getByRole("header", { name: "Assistance et suggestions" }),
  ).toBeOnTheScreen();
  expect(await readDiscoveryCompletion()).toBe(true);
  expect(mockAuth0.clearCredentials).toHaveBeenCalledTimes(1);
});

it("requires the actual age declaration after the skipped journey enters guest home", async () => {
  // Given
  const user = userEvent.setup();
  await openInstallation();
  await user.press(await screen.findByRole("button", { name: "Passer" }));

  // When
  await user.press(
    await screen.findByRole("button", { name: "Continuer en tant qu’invité" }),
  );

  // Then
  expect(
    await screen.findByRole("header", { name: "Quel est votre âge ?" }),
  ).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Passer" })).toBeNull();
  expect(await readDiscoveryCompletion()).toBe(true);
  expect(await readAgeDeclaration()).toBeNull();
  expect(nativeAdvertising.AdsConsent.gatherConsent).not.toHaveBeenCalled();
  expect(mockMobileAds.initialize).not.toHaveBeenCalled();
});

it.each([
  "maintenance",
  "minimum version",
  "unavailable configuration",
] as const)(
  "keeps the actual assistance route unavailable during %s",
  async (gate) => {
    // Given
    await AsyncStorage.setItem(initializationMarker, "true");
    await completeDiscovery();
    const access = applicationAccessResponse();
    if (gate === "maintenance") access.maintenance.active = true;
    else if (gate === "minimum version") {
      access.versions.ios.minimumVersion = "9.0.0";
      access.versions.android.minimumVersion = "9.0.0";
    }
    mockFetch.mockImplementation(async () => {
      if (gate === "unavailable configuration") throw new Error("Unavailable");
      return Response.json(access);
    });
    if (gate === "unavailable configuration") jest.useFakeTimers();

    // When
    await openInstallation("/support");
    if (gate === "unavailable configuration")
      await act(async () => jest.advanceTimersByTimeAsync(7500));

    // Then
    if (gate === "unavailable configuration")
      expect(
        await screen.findByRole("alert", { name: "Une erreur est survenue" }),
      ).toBeOnTheScreen();
    else
      expect(
        await screen.findByRole("header", {
          name:
            gate === "maintenance"
              ? "Blockout est en maintenance"
              : "Mets Blockout à jour.",
        }),
      ).toBeOnTheScreen();
    expect(screen.queryByLabelText("Titre")).toBeNull();
    expect(screen.queryByRole("button", { name: "Se connecter" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Besoin d’aide ?" })).toBeNull();
    expect(await readDiscoveryCompletion()).toBe(true);
  },
);

it("rejects old private reads, Pro callbacks and administrative grants after changing the native subject", async () => {
  // Given
  await AsyncStorage.setItem(initializationMarker, "true");
  await completeDiscovery();
  await submitAgeDeclaration(18);
  const privileged = accountResponse({
    username: "AccountA",
    permissions: { ...accountResponse().permissions, manageMaintenance: true },
  });
  const current = accountResponse({
    accountId: "00000000-0000-4000-8000-000000000002",
    username: "AccountB",
    email: "b@example.invalid",
  });
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : Response.json(privileged),
  );
  const user = userEvent.setup();
  await openInstallation("/profile");
  await screen.findByText("AccountA");
  expect(screen.getByRole("link", { name: "Maintenance" })).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Blockout Pro" }));
  await screen.findByText("Native store offer");
  const oldPaywall = mockPaywall;
  const oldClient = owners.client;
  const privateResponse = Promise.withResolvers<Response>();
  const privateRead = jest.fn(() => privateResponse.promise);
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : privateRead(),
  );
  let oldRead: ReturnType<typeof owners.account.refetch>;
  await act(() => {
    oldRead = owners.account.refetch();
  });
  await waitFor(() => expect(privateRead).toHaveBeenCalledTimes(1));
  mockFetch.mockImplementation(async (url) =>
    String(url).endsWith("/application-access")
      ? Response.json(applicationAccessResponse())
      : Response.json(current),
  );
  mockAuth0.webAuth.mockResolvedValue(credentialsFor("auth0|b"));
  mockAuth0.getCredentials.mockResolvedValue(credentialsFor("auth0|b"));

  // When
  await act(async () => {
    await owners.session.signIn("mobile-test");
  });
  await act(() => router.replace("/profile"));
  await screen.findByText("AccountB");
  await waitFor(() => expect(owners.pro.state.status).toBe("inactive"));
  await act(async () => {
    privateResponse.resolve(Response.json(privileged));
    await oldRead;
    oldPaywall.onPurchaseCompleted?.({
      customerInfo: customerInfo({
        active: { "Blockout Pro": entitlement() },
        all: { "Blockout Pro": entitlement() },
        verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
      }),
      storeTransaction: {
        transactionIdentifier: "synthetic-old-purchase",
        productIdentifier: "monthly",
        purchaseDate: "2026-10-30T12:00:00Z",
        purchaseToken: null,
        originalJson: null,
        signature: null,
      },
    });
    oldPaywall.onDismiss?.();
  });

  // Then
  expect(screen).toHavePathname("/profile");
  expect(screen.getByText("AccountB")).toBeOnTheScreen();
  expect(screen.queryByText("AccountA")).toBeNull();
  expect(screen.queryByRole("link", { name: "Maintenance" })).toBeNull();
  expect(owners.client).not.toBe(oldClient);
  expect(owners.session.subject).toBe("auth0|b");
  expect(owners.pro.state.status).toBe("inactive");
  expect(screen.queryByText("Compte Pro")).toBeNull();
  expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
});
