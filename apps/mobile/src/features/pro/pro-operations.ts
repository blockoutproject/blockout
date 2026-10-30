import Purchases, {
  type CustomerInfo,
  type PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import type { ProOperation } from "./pro-state";

/**
 * Uses documented SDK purchase outcomes; no error itself grants or withdraws rights.
 * Known SDK failures allow another explicit attempt; store failures may have charged.
 * Unknown errors and an operation still in progress retain F09's verification requirement.
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
    case codes.STORE_PROBLEM_ERROR:
    case codes.UNKNOWN_ERROR:
    case codes.OPERATION_ALREADY_IN_PROGRESS_ERROR:
      return "uncertain";
    default:
      return "failed";
  }
}

/**
 * Settles a confirmed/owned purchase once the SDK recognizes purchased native rights.
 * An independent gift or unknown origin cannot resolve payment; pending/uncertain transactions
 * still need their native outcome rather than an inference from another valid entitlement.
 */
export function verifiedProOperation(
  operation: ProOperation,
  customerInfo: CustomerInfo | null,
): ProOperation {
  const entitlement = customerInfo?.entitlements.active["Blockout Pro"];
  return (operation === "purchased" || operation === "already-owned") &&
    entitlement?.ownershipType === "PURCHASED" &&
    ["APP_STORE", "PLAY_STORE", "TEST_STORE"].includes(entitlement.store)
    ? "completed"
    : operation;
}

/** A failed restoration grants nothing; cancellation is quiet and other outcomes require verification. */
export function restoreErrorOutcome(error: unknown): ProOperation {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ? "cancelled"
    : "restore-uncertain";
}
