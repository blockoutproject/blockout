import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import type { ComponentType } from "react";
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";
import RootLayout from "@/app/_layout";
import OrdinaryLayout from "@/app/(ordinary)/_layout";
import ProfileRoute from "@/app/(ordinary)/(tabs)/(profile)/profile";
import { completeDiscovery } from "@/features/onboarding/discovery-state";
import { initializeV2Installation } from "@/features/onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "@/features/accounts/test-support/native-auth0";
import { accountResponse as mockAccountResponse } from "@/features/accounts/test-support/account-response";
import { mockPurchases } from "@/features/pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "@/features/pro/test-support/customer-info";
import { prepareProNativeIO } from "@/features/pro/test-support/pro-harness";
import * as proSessionModule from "@/features/pro/pro-session";
import { applicationAccessResponse as mockApplicationAccessResponse } from "@/shared/api/test-support/application-access";

jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        advertising: { ios: {}, android: {} },
        revenueCat: { iosApiKey: "test_public", androidApiKey: "test_public" },
      },
    },
  },
}));
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: ComponentType) => component,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/features/onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "@/features/accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("@/features/pro/test-support/native-purchases")
    .mockPurchases,
}));
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL) => {
    if (!String(url).endsWith("/application-access")) {
      return Response.json(mockAccountResponse());
    }
    const response = mockApplicationAccessResponse();
    return Response.json({
      ...response,
      maintenance: { ...response.maintenance, active: mockBlocked },
    });
  },
}));
const consentInfo: AdsConsentInfo = {
  status: AdsConsentStatus.OBTAINED,
  canRequestAds: true,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus:
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
};
const environment = { ...process.env };
let mockBlocked = false;

beforeEach(async () => {
  mockBlocked = false;
  jest.replaceProperty(
    proSessionModule,
    "proSession",
    proSessionModule.createProSession(),
  );
  prepareProNativeIO();
  Object.assign(process.env, {
    EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
    EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    EXPO_PUBLIC_AUTH0_AUDIENCE: "mobile-test",
    EXPO_PUBLIC_API_URL: "https://api.example.invalid",
  });
  await AsyncStorage.clear();
  await completeDiscovery();
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockPurchases.isConfigured.mockResolvedValue(false);
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.getConsentInfo)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockReset()
    .mockResolvedValue(consentInfo);
});
afterEach(async () => {
  await cleanup();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Mounts the actual Profile route under the root admission, session and advertising owners. */
async function mountProfile() {
  await renderRouter(
    {
      _layout: () => <RootLayout />,
      index: () => null,
      onboarding: () => null,
      "(operations)/_layout": () => <Stack />,
      "(recovery)/_layout": () => <Stack />,
      "(recovery)/sign-in": () => null,
      "(ordinary)/_layout": OrdinaryLayout,
      "(ordinary)/(tabs)/_layout": () => <Stack />,
      "(ordinary)/(tabs)/index": () => null,
      "(ordinary)/(tabs)/(profile)/profile/index": ProfileRoute,
      "(ordinary)/(sheets)/season": () => null,
      "(ordinary)/search/(sheets)/filters": () => null,
      "(ordinary)/search/(sheets)/choice": () => null,
      "(ordinary)/sign-in-invitation": () => null,
      access: () => <Text>Blocked admission</Text>,
    },
    { initialUrl: "/profile" },
  );
}

it("opens the required UMP form directly from the admitted guest profile", async () => {
  // Given
  await mountProfile();
  const user = userEvent.setup();
  const choices = await screen.findByRole("button", {
    name: "Choix publicitaires",
  });

  // When
  await user.press(choices);

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(screen).toHavePathname("/profile");
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeOnTheScreen();
  const actions = screen.getAllByRole("button");
  expect(
    actions.indexOf(screen.getByRole("button", { name: "Blockout Pro" })),
  ).toBeLessThan(actions.indexOf(choices));
});

it("hides the profile action when UMP reports privacy options are not required", async () => {
  // Given
  const noOptions: AdsConsentInfo = {
    status: AdsConsentStatus.NOT_REQUIRED,
    canRequestAds: true,
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
  };
  jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue(noOptions);
  jest
    .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
    .mockResolvedValue(noOptions);

  // When
  await mountProfile();
  await screen.findByRole("button", { name: "Blockout Pro" });
  await waitFor(() => expect(AdsConsent.requestInfoUpdate).toHaveBeenCalled());

  // Then
  expect(
    screen.queryByRole("button", { name: "Choix publicitaires" }),
  ).toBeNull();
  expect(
    screen.getByRole("link", { name: "Politique de confidentialité" }),
  ).toBeOnTheScreen();
  expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
});

it("prevents a duplicate opening while the native form is present and enables the row on dismissal", async () => {
  // Given
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockReturnValueOnce(consent.promise);
  await mountProfile();
  const user = userEvent.setup();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Choix publicitaires" }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Choix publicitaires" }),
  ).toBeDisabled();
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);

  // When
  await act(() => consent.resolve(consentInfo));

  // Then
  expect(
    screen.getByRole("button", { name: "Choix publicitaires" }),
  ).toBeEnabled();
  expect(screen).toHavePathname("/profile");
});

it("shows safe failure feedback and allows an explicit retry", async () => {
  // Given
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockRejectedValueOnce(new Error("private native payload"));
  await mountProfile();
  const user = userEvent.setup();

  // When
  await user.press(
    await screen.findByRole("button", { name: "Choix publicitaires" }),
  );

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
  );
  expect(screen.queryByText("private native payload")).toBeNull();
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);

  // When
  await user.press(screen.getByRole("button", { name: "Choix publicitaires" }));

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alert")).toBeNull();
});

it("keeps the profile action under ordinary admission", async () => {
  // Given
  mockBlocked = true;

  // When
  await mountProfile();

  // Then
  expect(await screen.findByText("Blocked admission")).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Choix publicitaires" }),
  ).toBeNull();
  expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
});

it("lets known active Pro use required privacy options without automatically presenting a consent form", async () => {
  // Given
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor("auth0|privacy-pro"),
  );
  mockPurchases.isConfigured.mockResolvedValue(true);
  const right = entitlement();
  const native = customerInfo({
    active: { "Blockout Pro": right },
    all: { "Blockout Pro": right },
    verification: right.verification,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(native);
  mockPurchases.logIn.mockResolvedValue({
    customerInfo: native,
    created: false,
  });
  await mountProfile();
  await screen.findByText("Compte Pro");

  // When
  await userEvent
    .setup()
    .press(await screen.findByRole("button", { name: "Choix publicitaires" }));

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(screen).toHavePathname("/profile");
});
