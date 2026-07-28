import { Platform } from "react-native";
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
} from "react-native-purchases";

import { CONFIG } from "@/src/shared/config/config";

export type RevenueCatFailureCode =
  | "configuration"
  | "identity"
  | "network"
  | "no-entitlement"
  | "operation-in-progress"
  | "pending"
  | "store"
  | "unknown";

export type RevenueCatConfiguration =
  | {
      status: "configured";
      entitlementId: string;
    }
  | {
      status: "unconfigured" | "degraded";
      errorCode: RevenueCatFailureCode;
    };

export type RevenueCatOperation =
  | "configure"
  | "customer-info"
  | "identity"
  | "listener"
  | "log-level"
  | "paywall";

let configuredRevenueCat: RevenueCatConfiguration | undefined;

/**
 * Configures the shared RevenueCat SDK once with validated platform configuration.
 *
 * @returns The stable configuration outcome consumed by the subscription provider.
 */
export function configureRevenueCat(): RevenueCatConfiguration {
  if (configuredRevenueCat) return configuredRevenueCat;

  const entitlementId = CONFIG.ENTITLEMENT_BLOCKOUT_PRO.trim();
  const apiKey =
    Platform.OS === "ios"
      ? CONFIG.REVENUECAT_IOS_API_KEY.trim()
      : Platform.OS === "android"
        ? CONFIG.REVENUECAT_ANDROID_API_KEY.trim()
        : "";

  if (!apiKey || !entitlementId) {
    configuredRevenueCat = {
      status: "unconfigured",
      errorCode: "configuration",
    };
    return configuredRevenueCat;
  }

  const startedAt = Date.now();

  try {
    const isDevelopment =
      (typeof __DEV__ !== "undefined" && __DEV__) || apiKey.startsWith("test_");
    void Purchases.setLogLevel(
      isDevelopment ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN,
    ).catch(() => {
      reportRevenueCatFailure({
        operation: "log-level",
        code: "configuration",
        identified: false,
        startedAt,
      });
    });

    Purchases.configure({ apiKey });
    configuredRevenueCat = { status: "configured", entitlementId };
  } catch {
    configuredRevenueCat = {
      status: "degraded",
      errorCode: "configuration",
    };
    reportRevenueCatFailure({
      operation: "configure",
      code: "configuration",
      identified: false,
      startedAt,
    });
  }

  return configuredRevenueCat;
}

/**
 * Maps provider errors to the bounded codes exposed by the subscription boundary.
 *
 * @param error Unknown failure returned by a RevenueCat operation.
 * @returns A stable code that never includes provider messages or user identifiers.
 */
export function mapRevenueCatError(error: unknown): RevenueCatFailureCode {
  const code = getPurchasesErrorCode(error);

  switch (code) {
    case PURCHASES_ERROR_CODE.CONFIGURATION_ERROR:
    case PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR:
      return "configuration";
    case PURCHASES_ERROR_CODE.INVALID_APP_USER_ID_ERROR:
    case PURCHASES_ERROR_CODE.LOG_OUT_ANONYMOUS_USER_ERROR:
      return "identity";
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
    case PURCHASES_ERROR_CODE.OFFLINE_CONNECTION_ERROR:
    case PURCHASES_ERROR_CODE.API_ENDPOINT_BLOCKED:
      return "network";
    case PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return "operation-in-progress";
    case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
      return "pending";
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
    case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
    case PURCHASES_ERROR_CODE.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return "store";
    default:
      return "unknown";
  }
}

/**
 * Emits bounded provider diagnostics without raw SDK payloads or identifiers.
 *
 * @param input Safe operational context owned by the subscription boundary.
 */
export function reportRevenueCatFailure(input: {
  operation: RevenueCatOperation;
  code: RevenueCatFailureCode;
  identified: boolean;
  startedAt: number;
}) {
  console.warn("[RevenueCat] operation failed", {
    operation: input.operation,
    outcome: "failure",
    platform: Platform.OS,
    identity: input.identified ? "identified" : "anonymous",
    durationMs: Math.max(0, Date.now() - input.startedAt),
    code: input.code,
  });
}

/**
 * Narrows an unknown SDK rejection to its stable RevenueCat code.
 */
function getPurchasesErrorCode(
  error: unknown,
): PurchasesError["code"] | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }

  const code = error.code;
  return typeof code === "string"
    ? (code as PurchasesError["code"])
    : undefined;
}
