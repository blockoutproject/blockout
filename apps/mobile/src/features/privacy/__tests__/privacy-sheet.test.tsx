import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Stack, router } from "expo-router";
import { renderRouter } from "expo-router/testing-library";
import { Text } from "react-native";
import type { ComponentType } from "react";
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";
import RootLayout from "../../../app/_layout";
import OrdinaryLayout from "../../../app/(ordinary)/_layout";
import PrivacyRoute from "../../../app/(ordinary)/privacy";
import CorrectionRoute from "../../../app/(ordinary)/privacy-age";
import { PrivacyEntry } from "../components/privacy-sheet";
import {
  readAgeDeclaration,
  submitAgeDeclaration,
} from "../../advertising/age-declaration";
import { completeDiscovery } from "../../onboarding/discovery-state";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import { accountResponse as mockAccountResponse } from "../../accounts/test-support/account-response";
import { mockPurchases } from "../../pro/test-support/native-purchases";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { prepareProNativeIO } from "../../pro/test-support/pro-harness";
import * as proSessionModule from "../../pro/pro-session";
import { usePro } from "../../pro";
import { applicationAccessResponse as mockApplicationAccessResponse } from "../../../shared/api/test-support/application-access";

jest.mock(
  "react-native-google-mobile-ads",
  () =>
    jest.requireActual("../../advertising/test-support/native-privacy")
      .nativeAdvertising,
);
jest.mock("@react-native-google-mobile-ads/facebook", () => ({
  setAdvertiserTrackingEnabled: jest.fn(),
}));
jest.mock("expo-tracking-transparency", () => ({
  getTrackingPermissionsAsync: jest.fn(async () => ({
    status: "denied",
    canAskAgain: false,
  })),
  requestTrackingPermissionsAsync: jest.fn(),
}));
jest.mock("expo-application", () => ({ nativeApplicationVersion: "2.9.0" }));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
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
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
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
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL) => {
    if (!String(url).endsWith("/application-access"))
      return Response.json(mockAccountResponse());
    const response = mockApplicationAccessResponse();
    return Response.json({
      ...response,
      maintenance: { ...response.maintenance, active: mockBlocked },
    });
  },
}));
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
  await submitAgeDeclaration(18, new Date());
  jest.mocked(initializeV2Installation).mockResolvedValue();
  mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(false);
  mockPurchases.isConfigured.mockResolvedValue(false);
  jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue({
    status: AdsConsentStatus.OBTAINED,
    canRequestAds: true,
    isConsentFormAvailable: true,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
  });
  jest
    .mocked(AdsConsent.getConsentInfo)
    .mockImplementation(() => AdsConsent.requestInfoUpdate());
  jest
    .mocked(AdsConsent.gatherConsent)
    .mockImplementation(() => AdsConsent.requestInfoUpdate());
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockImplementation(() => AdsConsent.requestInfoUpdate());
});
afterEach(async () => {
  await cleanup();
  process.env = { ...environment };
  jest.restoreAllMocks();
});

/** Real root/session/age/native-privacy owners and Router; only SDK/storage/HTTP I/O is controlled. */
async function mountJourney(initialUrl = "/", caller = ProfileCaller) {
  await renderRouter(
    {
      _layout: () => <RootLayout />,
      "(operations)/_layout": () => <Stack />,
      "(ordinary)/_layout": OrdinaryLayout,
      "(ordinary)/(tabs)/_layout": () => <Stack />,
      "(ordinary)/(tabs)/index": caller,
      "(ordinary)/privacy": PrivacyRoute,
      "(ordinary)/privacy-age": CorrectionRoute,
      access: () => <Text>Blocked admission</Text>,
    },
    { initialUrl },
  );
}

/** Minimal ordinary caller; production privacy and root/session owners remain real. */
function ProfileCaller() {
  return (
    <>
      <Text>Profile caller</Text>
      <PrivacyEntry />
    </>
  );
}

/** Opens the actual public profile action; each scenario installs its own native I/O outcomes. */
async function openPrivacy() {
  await mountJourney();
  await userEvent
    .setup()
    .press(await screen.findByRole("link", { name: "Confidentialité" }));
  await screen.findByRole("header", { name: "Confidentialité" });
}

it("offers only the two approved guest actions and replaces privacy with correction without stacked sheets", async () => {
  // Given
  await openPrivacy();
  const user = userEvent.setup();
  await screen.findByRole("button", { name: "Choix publicitaires" });

  // When
  await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Corriger mon âge" }),
  ).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "Confidentialité" })).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Choix publicitaires" }),
  ).toBeNull();
  expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  expect(
    screen.queryByRole("link", { name: /légal|support|aide/i }),
  ).toBeNull();
});

it("discards an unconfirmed correction and returns to privacy with the original declaration", async () => {
  // Given
  await openPrivacy();
  const original = await readAgeDeclaration();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));
  await user.press(
    await screen.findByRole("button", { name: "Augmenter l’âge" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(await readAgeDeclaration()).toEqual(original);
});

it("saves the shared form and returns to privacy with only category/date retained", async () => {
  // Given
  await openPrivacy();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));
  await user.press(
    await screen.findByRole("button", { name: "Augmenter l’âge" }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then
  expect(
    await screen.findByRole("header", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(await readAgeDeclaration()).toEqual({
    category: "under16",
    declaredAt: expect.any(String),
  });
});

it.each(["close", "system back"])(
  "keeps correction visible on %s until native consent preparation settles after the acknowledged save",
  async (dismissal) => {
    // Given
    await openPrivacy();
    const user = userEvent.setup();
    await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));
    await user.press(
      await screen.findByRole("button", { name: "Augmenter l’âge" }),
    );
    const consent = Promise.withResolvers<AdsConsentInfo>();
    jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));

    // Then: the native presenter stays on the correction sheet until its operation completes.
    await waitFor(async () =>
      expect(await readAgeDeclaration()).toEqual({
        category: "under16",
        declaredAt: expect.any(String),
      }),
    );
    expect(
      screen.getByRole("header", { name: "Corriger mon âge" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fermer" })).toBeDisabled();
    if (dismissal === "close")
      await user.press(screen.getByRole("button", { name: "Fermer" }));
    else await act(() => router.back());
    expect(
      screen.queryByRole("header", { name: "Confidentialité" }),
    ).toBeNull();
    await act(() =>
      consent.resolve({
        status: AdsConsentStatus.NOT_REQUIRED,
        canRequestAds: true,
        isConsentFormAvailable: false,
        privacyOptionsRequirementStatus:
          AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
      }),
    );
    expect(
      await screen.findByRole("header", { name: "Confidentialité" }),
    ).toBeOnTheScreen();
  },
);

it("reconfigures a confirmed same-category correction and preserves it when native gathering fails", async () => {
  // Given: the previous adult declaration remains the installation owner until confirmation.
  await openPrivacy();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));
  await fireEvent(
    await screen.findByRole("adjustable", { name: "Âge en années révolues" }),
    "change",
    { nativeEvent: { value: 20 } },
  );
  const priorCalls = jest.mocked(AdsConsent.gatherConsent).mock.calls.length;
  jest
    .mocked(AdsConsent.gatherConsent)
    .mockRejectedValueOnce(new Error("private SDK failure"));

  // When
  await user.press(screen.getByRole("button", { name: "Enregistrer" }));

  // Then: changing an acknowledged declaration invalidates preparation even when its category is unchanged.
  await waitFor(() =>
    expect(AdsConsent.gatherConsent).toHaveBeenCalledTimes(priorCalls + 1),
  );
  expect(
    await screen.findByRole("header", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(await readAgeDeclaration()).toEqual({
    category: "adult",
    declaredAt: expect.any(String),
  });
  expect(
    await screen.findByRole("alert", {
      name: "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
    }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  expect(screen.queryByText("private SDK failure")).toBeNull();
});

it("hides unavailable native advertising options and allows dismissal back to the caller", async () => {
  // Given
  jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue({
    status: AdsConsentStatus.NOT_REQUIRED,
    canRequestAds: true,
    isConsentFormAvailable: false,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
  });
  await openPrivacy();
  const user = userEvent.setup();

  // When
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Corriger mon âge" }),
    ).toBeEnabled(),
  );
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(await screen.findByText("Profile caller")).toBeOnTheScreen();
  expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
});

it("shows understandable native failure and permits an explicit retry without false confirmation", async () => {
  // Given
  await openPrivacy();
  const user = userEvent.setup();
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockRejectedValueOnce(new Error("private native payload"));

  // When
  await user.press(
    await screen.findByRole("button", { name: "Choix publicitaires" }),
  );

  // Then
  expect(
    await screen.findByText(
      "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Impossible de mettre à jour vos choix publicitaires. Réessayez.",
  );
  expect(screen.queryByText("private native payload")).toBeNull();
  expect(screen.queryByText("Une erreur est survenue")).toBeNull();
  expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();
  await user.press(screen.getByRole("button", { name: "Choix publicitaires" }));
  await waitFor(() =>
    expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(2),
  );
});

it.each(["/privacy", "/privacy-age"])(
  "keeps direct %s entry behind F12 admission",
  async (initialUrl) => {
    // Given
    mockBlocked = true;

    // When
    await mountJourney(initialUrl);

    // Then
    expect(await screen.findByText("Blocked admission")).toBeOnTheScreen();
    expect(
      screen.queryByRole("header", { name: "Confidentialité" }),
    ).toBeNull();
    expect(
      screen.queryByRole("header", { name: "Corriger mon âge" }),
    ).toBeNull();
    expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
  },
);

it("returns to privacy after native back without saving the correction", async () => {
  // Given
  await openPrivacy();
  const original = await readAgeDeclaration();
  const user = userEvent.setup();
  await user.press(screen.getByRole("button", { name: "Corriger mon âge" }));
  await user.press(
    await screen.findByRole("button", { name: "Augmenter l’âge" }),
  );

  // When
  await act(() => router.back());

  // Then
  expect(
    await screen.findByRole("header", { name: "Confidentialité" }),
  ).toBeOnTheScreen();
  expect(await readAgeDeclaration()).toEqual(original);
});

/** Public F09 projection alongside the ordinary profile entry, without exposing native evidence. */
function ProCaller() {
  const pro = usePro();
  return (
    <>
      <Text>Pro: {pro.state.status}</Text>
      <PrivacyEntry />
    </>
  );
}

it("keeps privacy controls accessible to known active Pro without a new consent prompt", async () => {
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
  await mountJourney("/", ProCaller);
  await screen.findByText("Pro: active");
  jest.mocked(AdsConsent.gatherConsent).mockClear();
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("link", { name: "Confidentialité" }));

  // Then
  expect(
    await screen.findByRole("button", { name: "Choix publicitaires" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Corriger mon âge" }),
  ).toBeOnTheScreen();
  expect(AdsConsent.gatherConsent).not.toHaveBeenCalled();
});

it("reveals required Pro options when the sheet opens before obsolete consent preparation settles", async () => {
  // Given: real F09 association and native UMP complete in the opposite order from privacy entry.
  mockAuth0.hasValidCredentials.mockResolvedValue(true);
  mockAuth0.getCredentials.mockResolvedValue(
    credentialsFor("auth0|privacy-race"),
  );
  mockPurchases.isConfigured.mockResolvedValue(true);
  const rights =
    Promise.withResolvers<Awaited<ReturnType<typeof mockPurchases.logIn>>>();
  mockPurchases.logIn.mockReturnValueOnce(rights.promise);
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);
  await mountJourney("/", ProCaller);
  await waitFor(() =>
    expect(AdsConsent.gatherConsent).toHaveBeenCalledTimes(1),
  );
  const right = entitlement();
  const native = customerInfo({
    active: { "Blockout Pro": right },
    all: { "Blockout Pro": right },
    verification: right.verification,
  });
  mockPurchases.getCustomerInfo.mockResolvedValue(native);
  await act(() => rights.resolve({ customerInfo: native, created: false }));
  await screen.findByText("Pro: active");
  const user = userEvent.setup();
  await user.press(screen.getByRole("link", { name: "Confidentialité" }));
  await screen.findByRole("header", { name: "Confidentialité" });

  // When
  await act(() =>
    consent.resolve({
      status: AdsConsentStatus.OBTAINED,
      canRequestAds: true,
      isConsentFormAvailable: true,
      privacyOptionsRequirementStatus:
        AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
    }),
  );

  // Then: the existing root owner refreshes information after settlement, without a second consent prompt.
  expect(
    await screen.findByRole("button", { name: "Choix publicitaires" }),
  ).toBeOnTheScreen();
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({
    tagForUnderAgeOfConsent: false,
  });
  expect(AdsConsent.gatherConsent).toHaveBeenCalledTimes(1);
});
