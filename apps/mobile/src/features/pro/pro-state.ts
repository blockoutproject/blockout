import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
} from "react-native-purchases";
import type { AccountSession, SessionSnapshot } from "../accounts";

/** Transient operation presentation, independent of SDK entitlement and never persisted. */
export type ProOperation =
  "idle" | "cancelled" | "pending" | "failed" | "uncertain" | "completed";

/**
 * Evidence captured for one F05 session by the native association/read owner.
 * A failed read with no usable SDK state supplies null, never an empty CustomerInfo.
 * Listener payloads have no session attribution and must not be tagged as current reads.
 */
export interface ProSessionState {
  readonly session: SessionSnapshot;
  readonly association: "pending" | "failed" | "associated";
  readonly customerInfo: CustomerInfo | null;
  readonly operation: ProOperation;
}

/**
 * Current-account presentation only. Active/inactive come exclusively from the SDK;
 * unavailable suppresses ads and purchase encouragement, while guests follow F11 rules.
 * Pending/uncertain operations require verification, even when SDK rights are inactive.
 */
export type ProState =
  | { status: "guest" }
  | {
      status: "unavailable";
      reason:
        | "account"
        | "association-pending"
        | "association-failed"
        | "customer-info";
      operation: ProOperation;
    }
  | {
      status: "active";
      entitlement: PurchasesEntitlementInfo;
      operation: ProOperation;
    }
  | { status: "inactive"; operation: ProOperation };

/**
 * Reads current F05 evidence without storing rights or calculating expiry.
 * Uses the live snapshot so synchronous logout invalidation takes effect before React rerenders.
 * The lifecycle owner must still discard obsolete completions before storing native evidence;
 * this projection cannot order native identity calls or attribute untagged SDK listener payloads.
 */
export function getProState(
  account: Pick<AccountSession, "status" | "getSnapshot">,
  native: ProSessionState | null,
): ProState {
  if (account.status === "guest") return { status: "guest" };

  const current = account.getSnapshot();
  if (account.status !== "authenticated" || !current.accountId) {
    return { status: "unavailable", reason: "account", operation: "idle" };
  }
  if (
    !native ||
    native.session.generation !== current.generation ||
    native.session.accountId !== current.accountId
  ) {
    return {
      status: "unavailable",
      reason: "association-pending",
      operation: "idle",
    };
  }
  if (native.association !== "associated") {
    return {
      status: "unavailable",
      reason:
        native.association === "pending"
          ? "association-pending"
          : "association-failed",
      operation: "idle",
    };
  }

  const { customerInfo, operation } = native;
  if (!customerInfo) {
    return { status: "unavailable", reason: "customer-info", operation };
  }
  const entitlement = customerInfo.entitlements.active["Blockout Pro"];
  return entitlement
    ? { status: "active", entitlement, operation }
    : { status: "inactive", operation };
}
