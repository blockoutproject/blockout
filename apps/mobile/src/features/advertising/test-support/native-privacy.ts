const info = {
  status: "OBTAINED",
  canRequestAds: true,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus: "REQUIRED",
};

/** Controlled native advertising I/O; suites override decisive responses for their scenario. */
export const nativeAdvertising = {
  __esModule: true,
  default: () => ({ initialize: jest.fn(async () => []) }),
  AdsConsentPrivacyOptionsRequirementStatus: {
    REQUIRED: "REQUIRED",
    NOT_REQUIRED: "NOT_REQUIRED",
  },
  AdsConsent: {
    requestInfoUpdate: jest.fn(async () => info),
    loadAndShowConsentFormIfRequired: jest.fn(async () => info),
    getConsentInfo: jest.fn(async () => info),
    showPrivacyOptionsForm: jest.fn(async () => info),
  },
  AdsConsentStatus: { OBTAINED: "OBTAINED", NOT_REQUIRED: "NOT_REQUIRED" },
};
