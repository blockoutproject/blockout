import type { SessionSnapshot } from "@/features/accounts";
import { PermissionStatus } from "expo";
import { nativeUserChoices } from "../test-support/native-privacy";
import { Platform } from "react-native";
import { waitFor } from "@testing-library/react-native";
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
let session: SessionSnapshot;
let context: AdvertisingPrivacyContext;
beforeEach(() => {
  session = { subject: null, accountId: null };
  context = {
    account: { status: "guest", ...session },
    pro: { status: "guest" },
    admission: { ordinary: true },
    category: "adult",
  };
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
    const preparation = privacy.synchronize();

    // Then: no native consent or request can overtake configuration acknowledgement.
    expect(mobileAds().setRequestConfiguration).toHaveBeenCalledWith({
      ageRestrictedTreatment: treatment,
      maxAdContentRating: rating,
    });
    expect(AdsConsent.requestInfoUpdate).not.toHaveBeenCalled();
    expect(mockAds.initialize).not.toHaveBeenCalled();
    expect(privacy.getSnapshot().choices).toBeNull();
    configured.resolve();
    await preparation;
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledWith({
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
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReturnValueOnce(consent.promise);
  jest.mocked(requestTrackingPermissionsAsync).mockResolvedValue({
    status: PermissionStatus.UNDETERMINED,
    granted: false,
    expires: "never",
    canAskAgain: true,
  });
  const privacy = createAdvertisingPrivacy({ getContext: () => context });

  // When
  const preparation = privacy.synchronize();
  await Promise.resolve();

  // Then
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  consent.resolve(consentInfo);
  await preparation;
  expect(requestTrackingPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  await privacy.showOptions();
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
  if (scenario === "under16" || scenario === "16–17") {
    context.category = scenario;
  }
  if (scenario === "denied" || scenario === "restricted") {
    jest.mocked(getTrackingPermissionsAsync).mockResolvedValue({
      status: PermissionStatus.DENIED,
      granted: false,
      expires: "never",
      canAskAgain: false,
    });
  }
  if (scenario === "refused-personalization") {
    jest.mocked(AdsConsent.getUserChoices).mockResolvedValue({
      ...personalized,
      selectPersonalisedAds: false,
    });
  }
  if (scenario === "unknown-rights") {
    context = {
      ...context,
      pro: {
        status: "unavailable",
        reason: "customer-info",
        operation: "idle",
      },
    };
  }
  const privacy = createAdvertisingPrivacy({ getContext: () => context });

  // When
  await privacy.synchronize();

  // Then
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().choices?.authorizedMode).not.toBe(
    "personalized",
  );
  if (scenario === "unknown-rights") {
    expect(mockAds.initialize).not.toHaveBeenCalled();
  }
  privacy.dispose();
});

it("does not prompt ATT when Pro becomes active during the native permission read", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "ios");
  const permission =
    Promise.withResolvers<
      Awaited<ReturnType<typeof getTrackingPermissionsAsync>>
    >();
  jest
    .mocked(getTrackingPermissionsAsync)
    .mockReturnValueOnce(permission.promise);
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  const preparation = privacy.synchronize();
  await waitFor(() =>
    expect(getTrackingPermissionsAsync).toHaveBeenCalledTimes(1),
  );

  // When
  context = {
    ...context,
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
  };
  privacy.invalidateAd();
  permission.resolve({
    status: PermissionStatus.UNDETERMINED,
    granted: false,
    expires: "never",
    canAskAgain: true,
  });
  await preparation;

  // Then
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
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
    if (failure === "native-refusal") {
      jest
        .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
        .mockResolvedValue({ ...consentInfo, canRequestAds: false });
    }
    if (failure === "configuration-error") {
      mockAds.setRequestConfiguration.mockRejectedValueOnce(error);
    }
    if (failure === "consent-error") {
      jest.mocked(AdsConsent.requestInfoUpdate).mockRejectedValueOnce(error);
    }
    if (failure === "helpers-error") {
      jest.mocked(AdsConsent.getUserChoices).mockRejectedValueOnce(error);
    }
    if (failure === "initialization-error") {
      mockAds.initialize.mockRejectedValueOnce(error);
    }
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });

    // When
    await privacy.synchronize()?.catch(() => undefined);
    const open = jest.fn();
    await privacy.openSportingTransition({
      key: {},
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

it.each(["configuration", "gathering"])(
  "keeps the same native action available after %s fails while recovering a corrected age",
  async (failure) => {
    // Given
    jest.replaceProperty(Platform, "OS", "android");
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });
    await privacy.synchronize();
    context = { ...context, category: "under16" };
    privacy.suspend();
    mockAds.setRequestConfiguration.mockRejectedValueOnce(
      new Error("private failure"),
    );
    await privacy.synchronize()?.catch(() => undefined);
    const priorUpdates = jest.mocked(AdsConsent.requestInfoUpdate).mock.calls
      .length;
    const priorRequests = jest.mocked(InterstitialAd.createForAdRequest).mock
      .calls.length;

    // When
    await privacy.refreshOptions();

    // Then: opening the menu only reads native applicability; the action must reestablish the corrected age.
    expect(privacy.getSnapshot()).toMatchObject({
      privacyOptionsRequired: true,
      choices: null,
    });
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(priorUpdates);
    expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(
      priorRequests,
    );
    expect(privacy.synchronize()).toBeUndefined();
    if (failure === "configuration") {
      mockAds.setRequestConfiguration.mockRejectedValueOnce(
        new Error("private failure"),
      );
    } else {
      jest
        .mocked(AdsConsent.requestInfoUpdate)
        .mockRejectedValueOnce(new Error("private failure"));
    }
    await privacy.showOptions()?.catch(() => undefined);
    expect(privacy.getSnapshot()).toMatchObject({
      privacyOptionsRequired: true,
      choices: null,
    });
    expect(AdsConsent.showPrivacyOptionsForm).not.toHaveBeenCalled();
    await privacy.showOptions();
    expect(AdsConsent.requestInfoUpdate).toHaveBeenLastCalledWith({
      tagForUnderAgeOfConsent: true,
    });
    expect(AdsConsent.showPrivacyOptionsForm).toHaveBeenCalledTimes(1);
    expect(AdsConsent.reset).not.toHaveBeenCalled();
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
  await privacy.synchronize();

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
  await privacy.synchronize();
  for (let index = 0; index < 9; index++) {
    await privacy.openSportingTransition({
      key: {},
      isCurrent: () => true,
      open: jest.fn(),
    });
  }
  for (const category of ["16–17", "under16", "adult"] as const) {
    // Given
    const previous = jest
      .mocked(InterstitialAd.createForAdRequest)
      .mock.results.at(-1)?.value;
    const configured = Promise.withResolvers<void>();
    mockAds.setRequestConfiguration.mockReturnValueOnce(configured.promise);

    // When
    context.category = category;
    const preparation = privacy.synchronize();

    // Then: retire the previous ad before acknowledging the next configuration.
    expect(previous?.destroy).toHaveBeenCalledTimes(1);
    expect(privacy.getSnapshot().choices).toBeNull();

    // When
    configured.resolve();
    await preparation;
  }

  // Given
  const ad = jest
    .mocked(InterstitialAd.createForAdRequest)
    .mock.results.at(-1)?.value;
  // Controlled native callback makes the next sporting action eligible at the retained threshold.
  (ad as unknown as ReturnType<typeof controlledInterstitial>).emit(
    AdEventType.LOADED,
  );

  // When
  const destination = privacy.openSportingTransition({
    key: {},
    isCurrent: () => true,
    open: jest.fn(),
  });

  // Then
  expect(ad?.show).toHaveBeenCalledTimes(1);

  // When
  (ad as unknown as ReturnType<typeof controlledInterstitial>).emit(
    AdEventType.CLOSED,
  );
  await destination;

  // Then
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
  await privacy.synchronize();
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
  form.resolve(consentInfo);
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

it("rejects an obsolete category result before preparing the corrected native age treatment", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReturnValueOnce(consent.promise);
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  const preparing = privacy.synchronize();
  await waitFor(() =>
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1),
  );

  // When
  context = { ...context, category: "under16" };
  const overlapping = privacy.synchronize();
  consent.resolve(consentInfo);
  await preparing;

  // Then
  expect(overlapping).toBeUndefined();
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(privacy.getSnapshot().choices).toBeNull();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();

  // When
  await privacy.synchronize();

  // Then
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(2);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(1);
  expect(AdsConsent.requestInfoUpdate).toHaveBeenLastCalledWith({
    tagForUnderAgeOfConsent: true,
  });
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  privacy.dispose();
});

it.each(["first-account", "account-switch", "Pro-activation"] as const)(
  "retires the prepared ad on %s while preserving installation consent and frequency",
  async (change) => {
    // Given
    jest.replaceProperty(Platform, "OS", "android");
    if (change === "account-switch") {
      context = {
        ...context,
        account: {
          status: "authenticated",
          subject: "auth0|a",
          accountId: "a",
        },
        pro: { status: "inactive", operation: "idle" },
      };
    }
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });
    await privacy.synchronize();
    const choices = privacy.getSnapshot().choices;
    const previous = jest.mocked(InterstitialAd.createForAdRequest).mock
      .results[0].value as unknown as ReturnType<typeof controlledInterstitial>;
    previous.emit(AdEventType.LOADED);
    for (let index = 0; index < 9; index++) {
      await privacy.openSportingTransition({
        key: {},
        isCurrent: () => true,
        open: jest.fn(),
      });
    }

    // When
    context = {
      ...context,
      account: { status: "authenticated", subject: "auth0|b", accountId: "b" },
      pro:
        change === "Pro-activation"
          ? { status: "active", entitlement: entitlement(), operation: "idle" }
          : { status: "inactive", operation: "idle" },
    };
    privacy.invalidateAd();
    await privacy.synchronize();
    previous.emit(AdEventType.LOADED);
    const open = jest.fn();
    await privacy.openSportingTransition({
      key: {},
      isCurrent: () => true,
      open,
    });

    // Then
    expect(previous.destroy).toHaveBeenCalledTimes(1);
    expect(previous.show).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledTimes(1);
    expect(privacy.getSnapshot().choices).toBe(choices);
    expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(
      1,
    );
    expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(
      change === "Pro-activation" ? 1 : 2,
    );

    if (change !== "Pro-activation") {
      // When: the replacement ad loads after the tenth action.
      const next = jest.mocked(InterstitialAd.createForAdRequest).mock
        .results[1].value as unknown as ReturnType<
        typeof controlledInterstitial
      >;
      next.emit(AdEventType.LOADED);
      const destination = privacy.openSportingTransition({
        key: {},
        isCurrent: () => true,
        open: jest.fn(),
      });

      // Then: removing the old account's ad did not reset installation frequency.
      expect(next.show).toHaveBeenCalledTimes(1);
      next.emit(AdEventType.CLOSED);
      await destination;
    }
    privacy.dispose();
  },
);

it.each(["unknown", "active"] as const)(
  "loads for newly inactive rights without repeating installation preparation from %s rights",
  async (initialRight) => {
    // Given
    jest.replaceProperty(Platform, "OS", "android");
    context = {
      ...context,
      account: { status: "authenticated", subject: "auth0|a", accountId: "a" },
      pro:
        initialRight === "active"
          ? { status: "active", entitlement: entitlement(), operation: "idle" }
          : {
              status: "unavailable",
              reason: "customer-info",
              operation: "idle",
            },
    };
    const privacy = createAdvertisingPrivacy({
      getContext: () => context,
      adUnitId: "test-unit",
    });
    await privacy.synchronize();
    expect(mockAds.initialize).not.toHaveBeenCalled();
    expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
    const choices = privacy.getSnapshot().choices;

    // When
    context = { ...context, pro: { status: "inactive", operation: "idle" } };
    privacy.invalidateAd();
    await privacy.synchronize();

    // Then
    expect(privacy.getSnapshot().choices).toEqual(choices);
    expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(
      1,
    );
    expect(mockAds.initialize).toHaveBeenCalledTimes(1);
    expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
    expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    privacy.dispose();
  },
);

it("completes a Pro-deferred native form when advertising becomes applicable without repeating the launch refresh", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  context = {
    ...context,
    account: { status: "authenticated", subject: "auth0|a", accountId: "a" },
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
  };
  jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue({
    ...consentInfo,
    canRequestAds: false,
  });
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  await privacy.synchronize();
  expect(privacy.getSnapshot().choices).toBeNull();
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
  const form = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
    .mockReturnValueOnce(form.promise);
  jest.mocked(AdsConsent.getUserChoices).mockResolvedValue({
    ...personalized,
    selectPersonalisedAds: false,
  });

  // When
  context = { ...context, pro: { status: "inactive", operation: "idle" } };
  privacy.invalidateAd();
  const preparation = privacy.synchronize();

  // Then: no request may overtake the native form's current decision.
  await waitFor(() =>
    expect(AdsConsent.loadAndShowConsentFormIfRequired).toHaveBeenCalledTimes(
      1,
    ),
  );
  expect(privacy.getSnapshot().choices).toBeNull();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();

  // When
  form.resolve(consentInfo);
  await preparation;

  // Then
  expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().choices?.authorizedMode).toBe("contextual");
  expect(mockAds.initialize).toHaveBeenCalledTimes(1);
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledWith("test-unit", {
    requestNonPersonalizedAdsOnly: true,
  });
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
  await privacy.synchronize();

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
  await privacy.synchronize();
  context.category = "under16";
  mockAds.setRequestConfiguration.mockRejectedValueOnce(
    new Error("private configuration error"),
  );
  await privacy.synchronize()?.catch(() => undefined);
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(false);

  // When
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReturnValueOnce(consent.promise);
  const recovery = privacy.showOptions();

  // Then: native options are not a bypass around the corrected UMP under-age flag.
  await waitFor(() =>
    expect(AdsConsent.requestInfoUpdate).toHaveBeenLastCalledWith({
      tagForUnderAgeOfConsent: true,
    }),
  );
  expect(InterstitialAd.createForAdRequest).toHaveBeenCalledTimes(1);
  jest.mocked(AdsConsent.loadAndShowConsentFormIfRequired).mockResolvedValue({
    ...consentInfo,
    privacyOptionsRequirementStatus:
      AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
  });
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

it("retains in-flight installation consent when Pro becomes known without a new prompt", async () => {
  // Given: permission work started while the current entitlement was unknown.
  jest.replaceProperty(Platform, "OS", "ios");
  context = {
    ...context,
    pro: { status: "unavailable", reason: "customer-info", operation: "idle" },
  };
  const consent = Promise.withResolvers<AdsConsentInfo>();
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockReturnValueOnce(consent.promise);
  const privacy = createAdvertisingPrivacy({ getContext: () => context });
  const preparation = privacy.synchronize();
  await waitFor(() =>
    expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1),
  );
  context = {
    ...context,
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
  };
  privacy.invalidateAd();
  expect(privacy.refreshOptions()).toBeUndefined();

  // When
  consent.resolve(consentInfo);
  await preparation;
  await privacy.synchronize();

  // Then: Pro keeps its required native controls without another preparation or ATT prompt.
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(privacy.getSnapshot().privacyOptionsRequired).toBe(true);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  privacy.dispose();
});

it("does not retry a failed Pro launch refresh when current rights become inactive", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  context = {
    ...context,
    account: { status: "authenticated", subject: "auth0|a", accountId: "a" },
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
  };
  jest
    .mocked(AdsConsent.requestInfoUpdate)
    .mockRejectedValueOnce(new Error("private native failure"));
  const privacy = createAdvertisingPrivacy({
    getContext: () => context,
    adUnitId: "test-unit",
  });
  await privacy.synchronize()?.catch(() => undefined);

  // When
  context = { ...context, pro: { status: "inactive", operation: "idle" } };
  privacy.invalidateAd();
  const retry = privacy.synchronize();

  // Then
  expect(retry).toBeUndefined();
  expect(privacy.getSnapshot().choices).toBeNull();
  expect(mockAds.setRequestConfiguration).toHaveBeenCalledTimes(1);
  expect(AdsConsent.requestInfoUpdate).toHaveBeenCalledTimes(1);
  expect(AdsConsent.loadAndShowConsentFormIfRequired).not.toHaveBeenCalled();
  expect(mockAds.initialize).not.toHaveBeenCalled();
  expect(InterstitialAd.createForAdRequest).not.toHaveBeenCalled();
  privacy.dispose();
});
