import type { AdsConsentUserChoices } from "react-native-google-mobile-ads";

/** Controlled native advertising I/O for real root/provider integration tests; no serving qualification. */
const info = {
  status: "OBTAINED",
  canRequestAds: true,
  isConsentFormAvailable: true,
  privacyOptionsRequirementStatus: "REQUIRED",
};

/** Shared native API shape; scenarios override decisive responses explicitly in their own setup. */
export const nativeAdvertising = {
  __esModule: true,
  default: () => ({
    setRequestConfiguration: jest.fn(async () => undefined),
    initialize: jest.fn(async () => []),
  }),
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
  AdsConsent: {
    gatherConsent: jest.fn(async () => info),
    requestInfoUpdate: jest.fn(async () => info),
    getConsentInfo: jest.fn(async () => info),
    showPrivacyOptionsForm: jest.fn(async () => info),
    getUserChoices: jest.fn(async () => nativeUserChoices()),
  },
  AdsConsentStatus: { OBTAINED: "OBTAINED", NOT_REQUIRED: "NOT_REQUIRED" },
};

/** Complete native helper result; each scenario keeps its decisive consent flags explicit. */
export function nativeUserChoices(
  overrides: Partial<AdsConsentUserChoices> = {},
): AdsConsentUserChoices {
  return {
    activelyScanDeviceCharacteristicsForIdentification: false,
    applyMarketResearchToGenerateAudienceInsights: false,
    createAPersonalisedAdsProfile: false,
    createAPersonalisedContentProfile: false,
    developAndImproveProducts: false,
    measureAdPerformance: false,
    measureContentPerformance: false,
    selectBasicAds: false,
    selectPersonalisedAds: false,
    selectPersonalisedContent: false,
    storeAndAccessInformationOnDevice: false,
    usePreciseGeolocationData: false,
    ...overrides,
  };
}
