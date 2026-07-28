import Purchases, { PURCHASES_ERROR_CODE } from "react-native-purchases";

import {
  configureRevenueCat,
  mapRevenueCatError,
} from "@/src/modules/subscription/providers/revenuecat-client";

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(() => Promise.resolve()),
  },
  LOG_LEVEL: {
    DEBUG: "DEBUG",
    WARN: "WARN",
  },
  PURCHASES_ERROR_CODE: {
    API_ENDPOINT_BLOCKED: "33",
    CONFIGURATION_ERROR: "23",
    INVALID_APP_USER_ID_ERROR: "14",
    INVALID_CREDENTIALS_ERROR: "11",
    LOG_OUT_ANONYMOUS_USER_ERROR: "22",
    NETWORK_ERROR: "10",
    OFFLINE_CONNECTION_ERROR: "35",
    OPERATION_ALREADY_IN_PROGRESS_ERROR: "15",
    PAYMENT_PENDING_ERROR: "20",
    PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: "5",
    PURCHASE_INVALID_ERROR: "4",
    PURCHASE_NOT_ALLOWED_ERROR: "3",
    RECEIPT_ALREADY_IN_USE_ERROR: "7",
    RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR: "13",
    STORE_PROBLEM_ERROR: "2",
  },
}));

jest.mock("@/src/shared/config/config", () => ({
  CONFIG: {
    ENTITLEMENT_BLOCKOUT_PRO: "Blockout Pro",
    REVENUECAT_ANDROID_API_KEY: "test_android",
    REVENUECAT_IOS_API_KEY: "test_ios",
  },
}));

const mockConfigure = jest.mocked(Purchases.configure);
const mockSetLogLevel = jest.mocked(Purchases.setLogLevel);

describe("RevenueCat client boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configures the shared SDK only once with debug logging first", () => {
    const first = configureRevenueCat();
    const second = configureRevenueCat();

    expect(first).toEqual({
      status: "configured",
      entitlementId: "Blockout Pro",
    });
    expect(second).toBe(first);
    expect(mockSetLogLevel).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockSetLogLevel.mock.invocationCallOrder[0]).toBeLessThan(
      mockConfigure.mock.invocationCallOrder[0],
    );
  });

  it.each([
    [PURCHASES_ERROR_CODE.CONFIGURATION_ERROR, "configuration"],
    [PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR, "identity"],
    [PURCHASES_ERROR_CODE.NETWORK_ERROR, "network"],
    [PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR, "network"],
    [
      PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR,
      "operation-in-progress",
    ],
    [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR, "pending"],
    [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR, "store"],
    ["999", "unknown"],
  ])("maps SDK code %s to %s", (code, expected) => {
    expect(mapRevenueCatError({ code })).toBe(expected);
  });
});
