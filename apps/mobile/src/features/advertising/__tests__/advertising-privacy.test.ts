import { PermissionStatus } from "expo";
import { nativeUserChoices } from "../test-support/native-privacy";
import { Platform } from "react-native";
import {
  AdsConsent,
  AdsConsentStatus,
  AdEventType,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
  InterstitialAd,
} from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { setAdvertiserTrackingEnabled } from "@react-native-google-mobile-ads/facebook";
import {
  createAdvertisingPrivacy,
  type AdvertisingPrivacyContext,
} from "../advertising-privacy";
import { controlledInterstitial } from "../test-support/interstitial";
import { entitlement } from "@/features/pro/test-support/customer-info";

jest.mock("react-native-google-mobile-ads", () => ({
  __esModule: true,
  default: () => mockAds,
  AgeRestrictedTreatment: {
    CHILD: "child",
    TEEN: "teen",
    UNSPECIFIED: "unspecified",
  },
  MaxAdContentRating: { G: "G", T: "T" },
  AdsConsentPrivacyOptionsRequirementStatus: {
    REQUIRED: "REQUIRED",
    NOT_REQUIRED: "NOT_REQUIRED",
  },
  AdsConsentStatus: { OBTAINED: "OBTAINED", NOT_REQUIRED: "NOT_REQUIRED" },
  AdsConsent: {
    requestInfoUpdate: jest.fn(),
    loadAndShowConsentFormIfRequired: jest.fn(),
    getConsentInfo: jest.fn(),
    showPrivacyOptionsForm: jest.fn(),
    getUserChoices: jest.fn(),
    reset: jest.fn(),
  },
  AdEventType: {
    LOADED: "loaded",
    OPENED: "opened",
    CLOSED: "closed",
    ERROR: "error",
  },
  InterstitialAd: { createForAdRequest: jest.fn() },
}));
jest.mock("expo-tracking-transparency", () => ({
  getTrackingPermissionsAsync: jest.fn(),
  requestTrackingPermissionsAsync: jest.fn(),
}));
jest.mock("@react-native-google-mobile-ads/facebook", () => ({
  setAdvertiserTrackingEnabled: jest.fn(),
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
const mockAds = { setRequestConfiguration: jest.fn(), initialize: jest.fn() };
const consentInfo: AdsConsentInfo = {
  canRequestAds: true,
  status: AdsConsentStatus.OBTAINED,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus:
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
};
const personalized = nativeUserChoices({
  storeAndAccessInformationOnDevice: true,
  createAPersonalisedAdsProfile: true,
  selectPersonalisedAds: true,
  selectBasicAds: true,
});
let context: AdvertisingPrivacyContext;
beforeEach(() => {
  context = {
    account: { subject: null, accountId: null },
    pro: { status: "guest" },
    admission: { ordinary: true },
    category: "adult",
  };
  jest.mocked(setAdvertiserTrackingEnabled).mockClear();
  mockAds.setRequestConfiguration.mockReset().mockResolvedValue(undefined);
  mockAds.initialize.mockReset().mockResolvedValue([]);
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
  jest
    .mocked(AdsConsent.getUserChoices)
    .mockReset()
    .mockResolvedValue(personalized);
  jest.mocked(getTrackingPermissionsAsync).mockReset().mockResolvedValue({
    status: PermissionStatus.UNDETERMINED,
    granted: false,
    expires: "never",
    canAskAgain: true,
  });
  jest.mocked(requestTrackingPermissionsAsync).mockReset().mockResolvedValue({
    status: PermissionStatus.GRANTED,
    granted: true,
    expires: "never",
    canAskAgain: false,
  });
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReset()
    .mockImplementation(
      () => controlledInterstitial() as unknown as InterstitialAd,
    );
});
afterEach(() => jest.restoreAllMocks());

it.each([
  { category: "under16", treatment: "child", rating: "G", tag: true },
  { category: "16–17", treatment: "teen", rating: "T", tag: false },
  { category: "adult", treatment: "unspecified", rating: "T", tag: false },
] as const)(
  "uses native UMP and current treatment for $category",
  async ({ category, treatment, rating, tag }) => {
    // Given
    context = { ...context, category };
    jest.replaceProperty(Platform, "OS", "android");
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "synthetic-unit",
    });

    // When
    await privacy.synchronize();
    await privacy.synchronize();

    // Then
    expect(mockAds.setRequestConfiguration).toHaveBeenCalledWith({
      ageRestrictedTreatment: treatment,
      maxAdContentRating: rating,
    });
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({
      tagForUnderAgeOfConsent: tag,
    });
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(
      1,
    );
    expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
    expect(AdsConsent.getUserChoices).not.toHaveBeenCalled();
    if (category === "under16") {
      expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
      expect(mockAds.initialize).not.toHaveBeenCalled();
    } else {
      expect(mockAds.initialize).toHaveBeenCalledTimes(1);
      expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith(
        "synthetic-unit",
      );
    }
  },
);

it.each([
  { refusal: "system", prompt: false },
  { refusal: "consent", prompt: false },
  { refusal: "neither", prompt: true },
])("respects $refusal in the one iOS ATT flow", async ({ refusal, prompt }) => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  jest.spyOn(Platform, "Version", "get").mockReturnValue("16.4");
  if (refusal === "system") {
    jest.mocked(getTrackingPermissionsAsync).mockResolvedValue({
      granted: false,
      status: PermissionStatus.DENIED,
      canAskAgain: false,
      expires: "never",
    });
  } else if (refusal === "consent") {
    jest
      .mocked(AdsConsent.getUserChoices)
      .mockResolvedValue(nativeUserChoices());
  }
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "synthetic-unit",
  });

  // When
  await privacy.synchronize();
  await privacy.synchronize();
  await privacy.showOptions();
  await privacy.synchronize();

  // Then: refusal may still allow a regular request under UMP's native authorization.
  expect(requestTrackingPermissionsAsync).toHaveBeenCalledTimes(prompt ? 1 : 0);
  expect(setAdvertiserTrackingEnabled).toHaveBeenNthCalledWith(1, prompt);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith(
    "synthetic-unit",
  );
  expect(mockAds.initialize).toHaveBeenCalledTimes(1);
});

it("defers the automatic form for Pro while preserving the installation update and current benefits", async () => {
  // Given
  context = {
    ...context,
    pro: { status: "active", operation: "idle", entitlement: entitlement() },
  };
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "synthetic-unit",
  });

  // When
  await privacy.synchronize();
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
  expect(mockAds.initialize).not.toHaveBeenCalled();

  // When: an explicit privacy options failure leaves the native launch form deferred for Pro.
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockRejectedValueOnce(new Error("SDK error"));
  await expect(privacy.showOptions()).rejects.toThrow(
    "Advertising choices could not be established",
  );
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();

  // When: RevenueCat resolves as inactive without a new installation.
  context = { ...context, pro: { status: "inactive", operation: "idle" } };
  await privacy.synchronize();
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
});

it("prepares consent with unresolved Pro rights but waits for current inactive rights to load", async () => {
  // Given
  context = {
    ...context,
    pro: { status: "unavailable", operation: "idle", reason: "customer-info" },
  };
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "synthetic-unit",
  });

  // When
  await privacy.synchronize();
  await privacy.synchronize();

  // Then
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(mockAds.initialize).not.toHaveBeenCalled();

  // When
  context.account = { subject: "auth0|new-session", accountId: "new-account" };
  context = { ...context, pro: { status: "inactive", operation: "idle" } };
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
});

it("continues to suppress ads when UMP can no longer request after an explicit choice", async () => {
  // Given
  const ad = controlledInterstitial();
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReturnValueOnce(ad as unknown as InterstitialAd);
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "synthetic-unit",
  });
  await privacy.synchronize();
  await privacy.synchronize();
  ad.emit(AdEventType.LOADED);
  const revoked = { ...consentInfo, canRequestAds: false };
  jest
    .mocked(AdsConsent.getConsentInfo)
    .mockResolvedValueOnce(consentInfo)
    .mockResolvedValue(revoked);

  // When
  await privacy.showOptions();
  await privacy.synchronize();
  const push = jest.fn();
  for (let index = 0; index < 10; index++) {
    privacy.openSportingDetail(true, push);
  }

  // Then
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect(ad.show).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledTimes(10);
});

it("allows explicit privacy retry with current native applicability after a failed form", async () => {
  // Given
  const privacy = createAdvertisingPrivacy({ getContext: () => context });
  await privacy.synchronize();
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockRejectedValueOnce(new Error("SDK error"));

  // When
  await expect(privacy.showOptions()).rejects.toThrow(
    "Advertising choices could not be established",
  );
  await privacy.showOptions();

  // Then
  expect(privacy.getSnapshot()).toEqual({
    pending: false,
    privacyOptionsRequired: true,
  });
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(2);
});

it("keeps an old age's UMP permission out after the corrected-age launch update fails", async () => {
  // Given
  const ad = controlledInterstitial();
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReturnValueOnce(ad as unknown as InterstitialAd);
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "synthetic-unit",
  });
  await privacy.synchronize();
  await privacy.synchronize();
  privacy.suspend();
  context = { ...context, category: "16–17" };
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockRejectedValueOnce(new Error("SDK error"));

  // When
  await privacy.synchronize();
  await privacy.synchronize();
  await privacy.refreshOptions();

  // Then
  expect(ad.destroy).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);

  // When: the explicit privacy action first refreshes consent with the new treatment.
  await privacy.showOptions();
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(3);
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(2);
});
