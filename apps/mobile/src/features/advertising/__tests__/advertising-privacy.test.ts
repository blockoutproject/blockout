import { PermissionStatus } from "expo";
import { nativeUserChoices } from "../test-support/native-privacy";
import { Platform } from "react-native";
import mobileAds, {
  AdsConsent,
  AdsConsentStatus,
  AdsConsentPrivacyOptionsRequirementStatus,
  type AdsConsentInfo,
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { setAdvertiserTrackingEnabled } from "@react-native-google-mobile-ads/facebook";
import { createSessionGeneration } from "../../accounts";
import {
  createAdvertisingPrivacy,
  type AdvertisingPrivacyContext,
} from "../advertising-privacy";
import { controlledInterstitial } from "../test-support/interstitial";
import { entitlement } from "../../pro/test-support/customer-info";

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
    gatherConsent: jest.fn(),
    requestInfoUpdate: jest.fn(),
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
let session: ReturnType<typeof createSessionGeneration>;
let context: AdvertisingPrivacyContext;

beforeEach(() => {
  session = createSessionGeneration();
  context = {
    account: { status: "guest", getSnapshot: session.getSnapshot },
    pro: { status: "guest" },
    admission: { ordinary: true },
    category: "adult",
  };
  mockAds.setRequestConfiguration.mockReset().mockResolvedValue(undefined);
  mockAds.initialize.mockReset().mockResolvedValue([]);
  jest
    .mocked(AdsConsent.gatherConsent)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.getConsentInfo)
    .mockReset()
    .mockResolvedValue(consentInfo);
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockReset()
    .mockResolvedValue(
      consentInfo as Awaited<
        ReturnType<typeof AdsConsent.showPrivacyOptionsForm>
      >,
    );
  jest
    .mocked(AdsConsent.getUserChoices)
    .mockReset()
    .mockResolvedValue(personalized);
  jest
    .mocked(getTrackingPermissionsAsync)
    .mockReset()
    .mockResolvedValue({
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      expires: "never",
      canAskAgain: true,
    } as Awaited<ReturnType<typeof getTrackingPermissionsAsync>>);
  jest
    .mocked(requestTrackingPermissionsAsync)
    .mockReset()
    .mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      expires: "never",
      canAskAgain: false,
    } as Awaited<ReturnType<typeof requestTrackingPermissionsAsync>>);
  jest
    .mocked(InterstitialAd.createForAdRequest)
    .mockReset()
    .mockImplementation(
      () => controlledInterstitial() as unknown as InterstitialAd,
    );
});
afterEach(() => jest.restoreAllMocks());

it.each([
  ["under16", "child", "G", true],
  ["16–17", "teen", "T", false],
  ["adult", "unspecified", "T", false],
] as const)(
  "awaits %s configuration before the separate UMP age flag and permits only its native mode",
  async (category, treatment, rating, underAge) => {
    // Given
    jest.replaceProperty(Platform, "OS", "android");
    context.category = category;
    const configured = Promise.withResolvers<void>();
    mockAds.setRequestConfiguration.mockReturnValueOnce(configured.promise);
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });

    // When
    const preparation = privacy.prepare();

    // Then: no native consent or request can overtake configuration acknowledgement.
    expect(mobileAds().setRequestConfiguration).toHaveBeenCalledWith({
      ageRestrictedTreatment: treatment,
      maxAdContentRating: rating,
    });
    expect(AdsConsent.gatherConsent).not.toHaveBeenCalled();
    expect(mockAds.initialize).not.toHaveBeenCalled();
    expect(privacy.getSnapshot().choices).toBeNull();
    configured.resolve();
    await preparation;
    expect(AdsConsent.gatherConsent).toHaveBeenCalledWith({
      tagForUnderAgeOfConsent: underAge,
    });
    expect(privacy.getSnapshot().choices?.authorizedMode).toBe(
      category === "adult" ? "personalized" : "contextual",
    );
    expect(getTrackingPermissionsAsync).not.toHaveBeenCalled();
    expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    privacy.dispose();
  },
);

it("requests iOS ATT only after applicable adult UMP, without a duplicate even if the system stays undetermined", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  const consent =
    Promise.withResolvers<
      Awaited<ReturnType<typeof AdsConsent.gatherConsent>>
    >();
  jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);
  jest.mocked(requestTrackingPermissionsAsync).mockResolvedValue({
    status: PermissionStatus.UNDETERMINED,
    granted: false,
    expires: "never",
    canAskAgain: true,
  } as Awaited<ReturnType<typeof requestTrackingPermissionsAsync>>);
  const privacy = createAdvertisingPrivacy({ getContext: () => context });

  // When
  const preparation = privacy.prepare();
  await Promise.resolve();

  // Then
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  consent.resolve(consentInfo);
  await preparation;
  expect(requestTrackingPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  await privacy.prepare();
  expect(requestTrackingPermissionsAsync).toHaveBeenCalledTimes(1);
  privacy.dispose();
});

it.each([
  "under16",
  "16–17",
  "denied",
  "restricted",
  "refused-personalization",
  "unknown-rights",
] as const)("does not prompt ATT for %s", async (scenario) => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  if (scenario === "under16" || scenario === "16–17")
    context.category = scenario;
  if (scenario === "denied" || scenario === "restricted")
    jest.mocked(getTrackingPermissionsAsync).mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      expires: "never",
      canAskAgain: false,
    } as Awaited<ReturnType<typeof getTrackingPermissionsAsync>>);
  if (scenario === "refused-personalization")
    jest.mocked(AdsConsent.getUserChoices).mockResolvedValue({
      ...personalized,
      selectPersonalisedAds: false,
    });
  if (scenario === "unknown-rights")
    context = {
      ...context,
      pro: {
        status: "unavailable",
        reason: "customer-info",
        operation: "idle",
      },
    };
  const privacy = createAdvertisingPrivacy({ getContext: () => context });

  // When
  await privacy.prepare();

  // Then
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().choices?.authorizedMode).not.toBe(
    "personalized",
  );
  if (scenario === "unknown-rights")
    expect(mockAds.initialize).not.toHaveBeenCalled();
  privacy.dispose();
});

it.each([
  "native-refusal",
  "configuration-error",
  "consent-error",
  "helpers-error",
  "initialization-error",
])(
  "keeps content available with no ads on %s, without reset or automatic retry",
  async (failure) => {
    // Given
    const error = new Error("private SDK payload");
    if (failure === "native-refusal")
      jest
        .mocked(AdsConsent.gatherConsent)
        .mockResolvedValue({ ...consentInfo, canRequestAds: false } as Awaited<
          ReturnType<typeof AdsConsent.gatherConsent>
        >);
    if (failure === "configuration-error")
      mockAds.setRequestConfiguration.mockRejectedValueOnce(error);
    if (failure === "consent-error")
      jest.mocked(AdsConsent.gatherConsent).mockRejectedValueOnce(error);
    if (failure === "helpers-error")
      jest.mocked(AdsConsent.getUserChoices).mockRejectedValueOnce(error);
    if (failure === "initialization-error")
      mockAds.initialize.mockRejectedValueOnce(error);
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });

    // When
    await privacy.prepare()?.catch(() => undefined);
    const open = jest.fn();
    await privacy.openSportingTransition({
      key: {},
      kind: "match",
      voluntary: true,
      isCurrent: () => true,
      open,
    });

    // Then
    expect(open).toHaveBeenCalledTimes(1);
    expect(privacy.getSnapshot().choices?.canRequestAds ?? false).toBe(false);
    expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
    expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(AdsConsent.reset).not.toHaveBeenCalled();
    expect(privacy.synchronize()).toBeUndefined();
    expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    privacy.dispose();
  },
);

it("reuses native cached choices and supports limited advertising after optional processing is refused", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  jest.mocked(AdsConsent.getUserChoices).mockResolvedValue({
    ...personalized,
    storeAndAccessInformationOnDevice: false,
  });
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });

  // When
  await privacy.prepare();

  // Then
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("limited");
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith("test-unit", {
    requestNonPersonalizedAdsOnly: true,
  });
  expect(AdsConsent.reset).not.toHaveBeenCalled();
  privacy.dispose();
});

it("invalidates initialized adult → teen → child → adult preparation before reconfiguration, preserving the threshold", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  await privacy.prepare();
  for (let index = 0; index < 9; index++)
    await privacy.openSportingTransition({
      key: {},
      kind: "match",
      voluntary: true,
      isCurrent: () => true,
      open: jest.fn(),
    });

  // When / Then: each confirmed treatment change retires even a same-mode ad before any pending configuration.
  for (const category of ["16–17", "under16", "adult"] as const) {
    const previous = jest
      .mocked(InterstitialAd.createForAdRequest)
      .mock.results.at(-1)?.value;
    const configured = Promise.withResolvers<void>();
    mockAds.setRequestConfiguration.mockReturnValueOnce(configured.promise);
    context.category = category;
    const preparation = privacy.prepare();
    expect(previous?.destroy).toHaveBeenCalledTimes(1);
    expect(privacy.getSnapshot().choices).toBeNull();
    configured.resolve();
    await preparation;
  }
  const ad = jest
    .mocked(InterstitialAd.createForAdRequest)
    .mock.results.at(-1)?.value;
  // Controlled native callback makes the next sporting action eligible at the retained threshold.
  (ad as unknown as ReturnType<typeof controlledInterstitial>).emit(
    AdEventType.LOADED,
  );
  const destination = privacy.openSportingTransition({
    key: {},
    kind: "match",
    voluntary: true,
    isCurrent: () => true,
    open: jest.fn(),
  });
  expect(ad?.show).toHaveBeenCalledTimes(1);
  (ad as unknown as ReturnType<typeof controlledInterstitial>).emit(
    AdEventType.CLOSED,
  );
  await destination;
  expect(mockAds.initialize).toHaveBeenCalledTimes(1);
  expect(AdsConsent.reset).not.toHaveBeenCalled();
  privacy.dispose();
});

it("keeps SDK privacy options conditional and refreshes authorization after a successful change", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  await privacy.prepare();
  const previous = jest.mocked(InterstitialAd.createForAdRequest).mock
    .results[0].value;
  const form =
    Promise.withResolvers<
      Awaited<ReturnType<typeof AdsConsent.showPrivacyOptionsForm>>
    >();
  jest
    .mocked(AdsConsent.showPrivacyOptionsForm)
    .mockReturnValueOnce(form.promise);

  // When
  const change = privacy.showOptions();
  await Promise.resolve();

  // Then
  expect(previous.destroy).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().choices).toBeNull();
  jest.mocked(AdsConsent.getUserChoices).mockResolvedValue({
    ...personalized,
    selectPersonalisedAds: false,
  });
  form.resolve(
    consentInfo as Awaited<
      ReturnType<typeof AdsConsent.showPrivacyOptionsForm>
    >,
  );
  await change;
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  jest.mocked(AdsConsent.getConsentInfo).mockResolvedValue({
    ...consentInfo,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
  });
  expect(await privacy.showOptions()).toBe(false);
  expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(false);
  privacy.dispose();
});

it("discards late private callbacks across a session change without inheriting the old authorization", async () => {
  // Given
  const consent =
    Promise.withResolvers<
      Awaited<ReturnType<typeof AdsConsent.gatherConsent>>
    >();
  jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  const preparing = privacy.prepare();
  await Promise.resolve();

  // When
  session.invalidate();
  privacy.suspend();
  consent.resolve(consentInfo);
  await preparing;

  // Then
  expect(privacy.getSnapshot().choices).toBeNull();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  privacy.dispose();
});

it("sets Meta's documented tracking flag only on older iOS before initialization", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  jest.spyOn(Platform, "Version", "get").mockReturnValue("16.4");
  const privacy = createAdvertisingPrivacy({ getContext: () => context });
  mockAds.initialize.mockImplementation(async () => {
    expect(setAdvertiserTrackingEnabled).toHaveBeenCalledWith(true);
    return [];
  });

  // When
  await privacy.prepare();

  // Then
  expect(setAdvertiserTrackingEnabled).toHaveBeenCalledWith(true);
  privacy.dispose();
});

it("reestablishes UMP age treatment before privacy options can recover a failed correction", async () => {
  // Given: an initialized adult ad must never survive a confirmed child correction.
  jest.replaceProperty(Platform, "OS", "android");
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  await privacy.prepare();
  context.category = "under16";
  mockAds.setRequestConfiguration.mockRejectedValueOnce(
    new Error("private configuration error"),
  );
  await privacy.prepare()?.catch(() => undefined);
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(false);

  // When
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);
  const recovery = privacy.showOptions();
  await Promise.resolve();
  await Promise.resolve();

  // Then: native options are not a bypass around the corrected UMP under-age flag.
  expect(AdsConsent.gatherConsent).toHaveBeenLastCalledWith({
    tagForUnderAgeOfConsent: true,
  });
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  consent.resolve({
    ...consentInfo,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
  });
  await recovery;
  expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  privacy.dispose();
});

it("refreshes Pro privacy applicability after an obsolete in-flight free preparation settles", async () => {
  // Given: permission work started while the current entitlement was unknown.
  jest.replaceProperty(Platform, "OS", "ios");
  context = {
    ...context,
    pro: { status: "unavailable", reason: "customer-info", operation: "idle" },
  };
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest.mocked(AdsConsent.gatherConsent).mockReturnValueOnce(consent.promise);
  const privacy = createAdvertisingPrivacy({ getContext: () => context });
  const preparation = privacy.prepare();
  await Promise.resolve();
  context = {
    ...context,
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
  };
  privacy.suspend();
  expect(privacy.refreshOptions()).toBeUndefined();

  // When
  consent.resolve(consentInfo);
  await preparation;
  await privacy.synchronize();

  // Then: Pro keeps its required native controls without a new consent or ATT prompt.
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({
    tagForUnderAgeOfConsent: false,
  });
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
  expect(AdsConsent.gatherConsent).toHaveBeenCalledTimes(1);
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  privacy.dispose();
});
