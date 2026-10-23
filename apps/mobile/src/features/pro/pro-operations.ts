import Purchases, { type PURCHASES_ERROR_CODE } from "react-native-purchases";
import type { ProOperation } from "./pro-state";

/** Maps native purchase outcomes conservatively; no error itself grants or withdraws rights. */
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
    case codes.PURCHASE_NOT_ALLOWED_ERROR:
    case codes.PURCHASE_INVALID_ERROR:
    case codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
    case codes.INELIGIBLE_ERROR:
    case codes.INSUFFICIENT_PERMISSIONS_ERROR:
    case codes.CONFIGURATION_ERROR:
    case codes.INVALID_CREDENTIALS_ERROR:
      return "failed";
    default:
      // Store/network/unknown failures may have lost a response after charging.
      return "uncertain";
  }
}
