import { Platform } from "react-native";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import mobileAds, {
  AdsConsent,
  type AdsConsentInfo,
  AdsConsentPrivacyOptionsRequirementStatus,
  AdsConsentStatus,
  InitializationState,
} from "react-native-google-mobile-ads";

import {
  initializeAdvertisingOnce,
  runAdvertisingBootstrap,
  showAdvertisingPrivacyOptions,
} from "@/src/modules/advertising/api/advertising-client";

jest.mock("react-native", () => {
  return {
    Platform: { OS: "ios" },
  };
});

jest.mock("expo-tracking-transparency", () => ({
  PermissionStatus: {
    GRANTED: "granted",
    UNDETERMINED: "undetermined",
  },
  getTrackingPermissionsAsync: jest.fn(),
  requestTrackingPermissionsAsync: jest.fn(),
}));

jest.mock("react-native-google-mobile-ads", () => {
  const initialize = jest.fn();
  return {
    __esModule: true,
    default: jest.fn(() => ({ initialize })),
    __initialize: initialize,
    AdsConsent: {
      requestInfoUpdate: jest.fn(),
      loadAndShowConsentFormIfRequired: jest.fn(),
      getConsentInfo: jest.fn(),
      getGdprApplies: jest.fn(),
      getPurposeConsents: jest.fn(),
      showPrivacyOptionsForm: jest.fn(),
    },
    AdsConsentPrivacyOptionsRequirementStatus: {
      REQUIRED: "REQUIRED",
      NOT_REQUIRED: "NOT_REQUIRED",
    },
    AdsConsentStatus: {
      OBTAINED: "OBTAINED",
    },
    InitializationState: {
      AdapterInitializationStateNotReady: 0,
      AdapterInitializationStateReady: 1,
    },
  };
});

const consentReady: AdsConsentInfo = {
  status: AdsConsentStatus.OBTAINED,
  canRequestAds: true,
  privacyOptionsRequirementStatus:
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED,
  isConsentFormAvailable: true,
};

const initializeMock = (mobileAds as jest.MockedFunction<typeof mobileAds>)()
  .initialize as jest.Mock;

describe("advertising client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    expect(Platform.OS).toBe("ios");
    jest.mocked(AdsConsent.requestInfoUpdate).mockResolvedValue(consentReady);
    jest
      .mocked(AdsConsent.loadAndShowConsentFormIfRequired)
      .mockResolvedValue(consentReady);
    jest.mocked(AdsConsent.getConsentInfo).mockResolvedValue(consentReady);
    jest.mocked(AdsConsent.getGdprApplies).mockResolvedValue(true);
    jest.mocked(AdsConsent.getPurposeConsents).mockResolvedValue("1");
    jest.mocked(getTrackingPermissionsAsync).mockResolvedValue({
      status: PermissionStatus.UNDETERMINED,
      granted: false,
      canAskAgain: true,
      expires: "never",
    });
    jest.mocked(requestTrackingPermissionsAsync).mockResolvedValue({
      status: PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: "never",
    });
    initializeMock.mockResolvedValue([
      {
        name: "google",
        description: "ready",
        state: InitializationState.AdapterInitializationStateReady,
      },
    ]);
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("orders refreshed consent before ATT and SDK initialization", async () => {
    const result = await runAdvertisingBootstrap();

    expect(result).toMatchObject({
      status: "ready",
      consentEvidence: "fresh",
      canRequestAds: true,
      privacyOptionsRequired: true,
      adapterReadiness: [{ name: "google", ready: true }],
    });
    expect(
      jest.mocked(AdsConsent.requestInfoUpdate).mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(requestTrackingPermissionsAsync).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(requestTrackingPermissionsAsync).mock.invocationCallOrder[0],
    ).toBeLessThan(initializeMock.mock.invocationCallOrder[0]);
  });

  it("does not request ATT without GDPR purpose-one consent", async () => {
    jest.mocked(AdsConsent.getPurposeConsents).mockResolvedValue("0");

    const result = await runAdvertisingBootstrap();

    expect(result.status).toBe("ready");
    expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("uses cached consent evidence after a refresh failure", async () => {
    jest
      .mocked(AdsConsent.requestInfoUpdate)
      .mockRejectedValue(new Error("offline"));

    const result = await runAdvertisingBootstrap();

    expect(result).toMatchObject({
      status: "ready",
      consentEvidence: "cached",
      canRequestAds: true,
    });
    expect(AdsConsent.getConsentInfo).toHaveBeenCalledTimes(1);
    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("does not initialize when UMP cannot request ads", async () => {
    jest.mocked(AdsConsent.loadAndShowConsentFormIfRequired).mockResolvedValue({
      ...consentReady,
      canRequestAds: false,
    });

    const result = await runAdvertisingBootstrap();

    expect(result).toMatchObject({
      status: "unavailable",
      canRequestAds: false,
    });
    expect(initializeMock).not.toHaveBeenCalled();
    expect(requestTrackingPermissionsAsync).not.toHaveBeenCalled();
  });

  it("exposes partial adapter readiness", async () => {
    initializeMock.mockResolvedValue([
      {
        name: "google",
        description: "ready",
        state: InitializationState.AdapterInitializationStateReady,
      },
      {
        name: "meta",
        description: "not ready",
        state: InitializationState.AdapterInitializationStateNotReady,
      },
    ]);

    const result = await runAdvertisingBootstrap();

    expect(result).toMatchObject({
      status: "partial",
      adapterReadiness: [
        { name: "google", ready: true },
        { name: "meta", ready: false },
      ],
    });
  });

  it("deduplicates provider initialization", async () => {
    const first = initializeAdvertisingOnce();
    const second = initializeAdvertisingOnce();

    await expect(first).resolves.toMatchObject({ status: "ready" });
    await expect(second).resolves.toMatchObject({ status: "ready" });

    jest.mocked(AdsConsent.showPrivacyOptionsForm).mockResolvedValue({
      ...consentReady,
      privacyOptionsRequirementStatus:
        AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
    });
    await showAdvertisingPrivacyOptions();

    expect(initializeMock).toHaveBeenCalledTimes(1);
  });

  it("re-evaluates the request gate after the privacy-options form", async () => {
    jest.mocked(AdsConsent.showPrivacyOptionsForm).mockResolvedValue({
      ...consentReady,
      privacyOptionsRequirementStatus:
        AdsConsentPrivacyOptionsRequirementStatus.NOT_REQUIRED,
    });

    const result = await showAdvertisingPrivacyOptions();

    expect(result).toMatchObject({
      status: "ready",
      canRequestAds: true,
      privacyOptionsRequired: false,
    });
    expect(initializeMock).not.toHaveBeenCalled();
  });

  it("exposes a stable failed state when SDK initialization fails", async () => {
    initializeMock.mockRejectedValue(
      Object.assign(new Error("provider details"), {
        code: "googleMobileAds/initialization",
      }),
    );

    const result = await runAdvertisingBootstrap();

    expect(result).toMatchObject({
      status: "failed",
      canRequestAds: false,
      errorCode: "googleMobileAds/initialization",
    });
  });
});
