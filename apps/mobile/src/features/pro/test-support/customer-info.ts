import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
} from "react-native-purchases";
const { VERIFICATION_RESULT } = Purchases;

/** Synthetic SDK data only; no native purchase, cache or identity behavior is simulated. */
export function entitlement(
  overrides: Partial<PurchasesEntitlementInfo> = {},
): PurchasesEntitlementInfo {
  return {
    identifier: "Blockout Pro",
    isActive: true,
    willRenew: true,
    periodType: "NORMAL",
    latestPurchaseDate: "2026-01-01T00:00:00Z",
    latestPurchaseDateMillis: 1767225600000,
    originalPurchaseDate: "2026-01-01T00:00:00Z",
    originalPurchaseDateMillis: 1767225600000,
    expirationDate: "2026-02-01T00:00:00Z",
    expirationDateMillis: 1769904000000,
    store: "APP_STORE",
    productIdentifier: "monthly",
    productPlanIdentifier: null,
    isSandbox: true,
    unsubscribeDetectedAt: null,
    unsubscribeDetectedAtMillis: null,
    billingIssueDetectedAt: null,
    billingIssueDetectedAtMillis: null,
    ownershipType: "PURCHASED",
    verification: VERIFICATION_RESULT.NOT_REQUESTED,
    ...overrides,
  };
}

/** Builds the native shape with explicit entitlement maps; unrelated customer fields are inert. */
export function customerInfo(
  entitlements: CustomerInfo["entitlements"],
): CustomerInfo {
  return {
    entitlements,
    activeSubscriptions: [],
    allPurchasedProductIdentifiers: [],
    latestExpirationDate: null,
    firstSeen: "2026-01-01T00:00:00Z",
    originalAppUserId: "synthetic-original-customer",
    requestDate: "2026-01-01T00:00:00Z",
    allExpirationDates: {},
    allPurchaseDates: {},
    originalApplicationVersion: null,
    originalPurchaseDate: null,
    managementURL: null,
    nonSubscriptionTransactions: [],
    subscriptionsByProductIdentifier: {},
  };
}
