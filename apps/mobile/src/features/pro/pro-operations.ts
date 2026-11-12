import Purchases, {
  type CustomerInfo,
  type PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import type { ProOperation } from "./pro-state";

/**
 * Uses documented SDK purchase outcomes; no error itself grants or withdraws rights.
 * Errors release this attempt for ordinary feedback and a later explicit SDK action.
 * Store errors may have charged; this classification never claims cancellation or retries payment.
 * The SDK still owns an original operation reported as already in progress.
 * @see https://www.revenuecat.com/docs/test-and-launch/errors
 */
export function purchaseErrorOutcome(code: PURCHASES_ERROR_CODE): ProOperation {
  const codes = Purchases.PURCHASES_ERROR_CODE;
  switch (code) {
    case codes.PURCHASE_CANCELLED_ERROR:
      return "cancelled";
    case codes.PAYMENT_PENDING_ERROR:
      return "pending";
    case codes.PRODUCT_ALREADY_PURCHASED_ERROR:
    case codes.RECEIPT_ALREADY_IN_USE_ERROR:
    case codes.RECEIPT_IN_USE_BY_OTHER_SUBSCRIBER_ERROR:
      return "already-owned";
    default:
      return "failed";
  }
}

/**
 * Current SDK-purchased rights settle pending/confirmed/owned presentation without correlating a historical request.
 * An independent gift or unknown origin does not establish purchased rights.
 */
export function verifiedProOperation(
  operation: ProOperation,
  customerInfo: CustomerInfo | null,
): ProOperation {
  const entitlement = customerInfo?.entitlements.active["Blockout Pro"];
  return ["purchased", "already-owned", "pending"].includes(operation) &&
    entitlement?.ownershipType === "PURCHASED" &&
    ["APP_STORE", "PLAY_STORE", "TEST_STORE"].includes(entitlement.store)
    ? "completed"
    : operation;
}

/** Restoration errors use ordinary failure feedback; cancellation stays quiet and neither outcome grants rights. */
export function restoreErrorOutcome(error: unknown): ProOperation {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ? "cancelled"
    : "failed";
}

/** Restoration cannot erase unresolved payment evidence or encourage a second payment. */
export function restoredProOperation(
  current: ProOperation,
  outcome: ProOperation,
): ProOperation {
  return ["purchased", "pending", "already-owned"].includes(current)
    ? current
    : outcome;
}
