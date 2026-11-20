import { PermissionStatus } from "expo";
import { Platform } from "react-native";
import {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdEventType,
  InterstitialAd,
  type AdsConsentInfo,
} from "react-native-google-mobile-ads";
import { getTrackingPermissionsAsync } from "expo-tracking-transparency";
import { setAdvertiserTrackingEnabled } from "@react-native-google-mobile-ads/facebook";
import { createAdvertisingPrivacy } from "../advertising-privacy";
import { controlledInterstitial } from "../test-support/interstitial";

jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: () => ({ initialize: mockInitialize }),
  AdsConsentStatus: { OBTAINED: "OBTAINED" },
  AdsConsentPrivacyOptionsRequirementStatus: {
    REQUIRED: "REQUIRED",
    NOT_REQUIRED: "NOT_REQUIRED",
  },
  AdsConsent: {
    requestInfoUpdate: jest.fn(),
    loadAndShowConsentFormIfRequired: jest.fn(),
    getConsentInfo: jest.fn(),
    showPrivacyOptionsForm: jest.fn(),
  },
  AdEventType: { LOADED: "loaded", CLOSED: "closed", ERROR: "error" },
  InterstitialAd: { createForAdRequest: jest.fn() },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockInitialize = jest.fn(async () => []);
const consent: AdsConsentInfo = {
  canRequestAds: true,
  status: AdsConsentStatus.OBTAINED,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus:
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
};

function admittedUser(adUnitId?: string) {
  const privacy = createAdvertisingPrivacy({ adUnitId });
  const context = {
    ordinary: true,
    subject: null,
    accountId: null,
    isFree: () => true,
  };
  privacy.setContext(context);
  return { privacy, context };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue(consent);
  jest
    .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
    .mockResolvedValue(consent);
  jest.mocked(AdsConsent.getConsentInfo).mockResolvedValue(consent);
  jest.mocked(AdsConsent.showPrivacyOptionsForm).mockResolvedValue(consent);
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockImplementation(
      () => controlledInterstitial() as unknown as InterstitialAd,
    );
});
afterEach(() => jest.restoreAllMocks());

it("prepares one native consent flow and loads using SDK request permission", async () => {
  // Given
  const { privacy } = admittedUser("test-unit");

  // When
  await privacy.synchronize();
  await privacy.synchronize();

  // Then
  expect(jest.mocked(AdsConsent.requestInfoUpdate).mock.calls).toEqual([[]]);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(AdsConsent.getConsentInfo).not.toHaveBeenCalled();
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith("test-unit");
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
});

it("keeps advertising options available to Pro without prompting or initializing ads", async () => {
  // Given
  const { privacy, context } = admittedUser("test-unit");
  privacy.setContext({ ...context, isFree: () => false });
  await privacy.synchronize();

  // When
  await privacy.showPrivacyOptions();

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
});

it("allows privacy options as soon as UMP is ready during SDK initialization", async () => {
  // Given
  const started = Promise.withResolvers<void>();
  const initialized = Promise.withResolvers<never[]>();
  mockInitialize.mockImplementationOnce(() => {
    started.resolve();
    return initialized.promise;
  });
  const { privacy } = admittedUser("test-unit");
  const preparing = privacy.synchronize();
  await started.promise;

  // When
  await privacy.showPrivacyOptions();

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
  initialized.resolve([]);
  await preparing;
  expect(mockInitialize).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
});

it("defers a form until current rights allow it and never refetches consent for an account switch", async () => {
  // Given
  const { privacy, context } = admittedUser("test-unit");
  let free = false;
  privacy.setContext({ ...context, isFree: () => free });
  await privacy.synchronize();
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();

  // When
  free = true;
  await privacy.synchronize();
  privacy.setContext({
    ...context,
    subject: "another-principal",
    accountId: "another-account",
  });
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(mockInitialize).toHaveBeenCalledTimes(1);
});

it.each([true, false])(
  "uses cached SDK permission (%s) when the update fails",
  async (canRequestAds) => {
    // Given
    const { privacy } = admittedUser("test-unit");
    jest
      .mocked(AdsConsent.requestInfoUpdate)
      .mockRejectedValueOnce(new Error("Update unavailable"));
    jest
      .mocked(AdsConsent.getConsentInfo)
      .mockResolvedValueOnce({ ...consent, canRequestAds });

    // When
    await privacy.synchronize();

    // Then
    expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
    expect(mockInitialize).toHaveBeenCalledTimes(canRequestAds ? 1 : 0);
    expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(
      canRequestAds ? 1 : 0,
    );
  },
);

it("retains immediate navigation and never initializes if the ad unit is missing", async () => {
  // Given
  const { privacy } = admittedUser();
  const open = jest.fn();

  // When
  await privacy.synchronize();
  privacy.openSportingDestination(open, () => true);

  // Then
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
  expect(mockInitialize).not.toHaveBeenCalled();
  expect(open).toHaveBeenCalledTimes(1);
});

it("retires preparation and respects changed native request permission", async () => {
  // Given
  const { privacy } = admittedUser("test-unit");
  const ad = controlledInterstitial();
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReturnValueOnce(ad as unknown as InterstitialAd);
  await privacy.synchronize();
  ad.emit(AdEventType.LOADED);
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockResolvedValueOnce({ ...consent, canRequestAds: false });

  // When
  await privacy.showPrivacyOptions();
  const open = jest.fn();
  for (let index = 0; index < 10; index++) {
    privacy.openSportingDestination(open, () => true);
  }

  // Then
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect(open).toHaveBeenCalledTimes(10);
});

it.each([PermissionStatus.GRANTED, PermissionStatus.DENIED])(
  "forwards the actual older-iOS ATT status (%s) to Meta before initializing",
  async (status) => {
    // Given
    jest.replaceProperty(Platform, "OS", "ios");
    jest.spyOn(Platform, "Version", "get").mockReturnValue("16.6");
    const { privacy } = admittedUser("test-unit");
    const granted = status === PermissionStatus.GRANTED;
    jest.mocked(getTrackingPermissionsAsync).mockResolvedValueOnce({
      status,
      granted,
      expires: "never",
      canAskAgain: false,
    });

    // When
    await privacy.synchronize();

    // Then
    expect(setAdvertiserTrackingEnabled).toHaveBeenCalledWith(granted);
    expect(
      jest.mocked(setAdvertiserTrackingEnabled).mock.invocationCallOrder[0],
    ).toBeLessThan(mockInitialize.mock.invocationCallOrder[0]);
  },
);

it("does not open a previous account's retained sporting destination", async () => {
  // Given
  const { privacy, context } = admittedUser("test-unit");
  const ad = controlledInterstitial();
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReturnValueOnce(ad as unknown as InterstitialAd);
  await privacy.synchronize();
  ad.emit(AdEventType.LOADED);
  for (let index = 0; index < 9; index++) {
    privacy.openSportingDestination(jest.fn(), () => true);
  }
  const oldDestination = jest.fn();
  privacy.openSportingDestination(oldDestination, () => true);

  // When
  privacy.setContext({ ...context, subject: "other", accountId: "other" });
  ad.emit(AdEventType.CLOSED);

  // Then
  expect(ad.show).toHaveBeenCalledTimes(1);
  expect(oldDestination).not.toHaveBeenCalled();
});
