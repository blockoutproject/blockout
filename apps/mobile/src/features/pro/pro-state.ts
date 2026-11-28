import type {
  CustomerInfo,
  PurchasesEntitlementInfo,
} from "react-native-purchases";
import type { AccountSession, SessionSnapshot } from "@/features/accounts";

/** Transient operation presentation, independent of SDK entitlement and never persisted. */
export type ProOperation =
  | "idle"
  | "restored"
  | "cancelled"
  | "pending"
  | "failed"
  | "purchased"
  | "already-owned"
  | "completed";

/**
 * Evidence captured for one F05 session by the native association/read owner.
 * Null CustomerInfo represents unavailable SDK evidence.
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
 * Store-pending and confirmed-but-unrecognized purchase facts remain separate from inactive rights.
 */
export type ProState =
  | {
      status: "guest";
    }
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
  | {
      status: "inactive";
      operation: ProOperation;
    };

export function activeProEntitlement(customerInfo: CustomerInfo | null) {
  return customerInfo?.entitlements.active["Blockout Pro"];
}

/**
 * Reads current F05 evidence without storing rights or calculating expiry.
 * Uses the current React principal and business account; SDK identity sequencing remains independent.
 * The lifecycle owner must still discard obsolete completions before storing native evidence;
 * this projection cannot order native identity calls or attribute untagged SDK listener payloads.
 */
export function getProState(
  account: Pick<AccountSession, "status" | "subject" | "accountId">,
  native: ProSessionState | null,
): ProState {
  if (account.status === "guest") {
    return { status: "guest" };
  }
  if (account.status !== "authenticated" || !account.accountId) {
    return { status: "unavailable", reason: "account", operation: "idle" };
  }
  if (
    !native ||
    native.session.subject !== account.subject ||
    native.session.accountId !== account.accountId
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
  const entitlement = activeProEntitlement(customerInfo);
  return entitlement
    ? { status: "active", entitlement, operation }
    : { status: "inactive", operation };
}
