import type { SessionSnapshot, AccountSession } from "../../accounts";
import Purchases, {
  type PurchasesEntitlementInfo,
} from "react-native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";
import {
  getProState,
  type ProOperation,
  type ProSessionState,
} from "../pro-state";

// Preserve public SDK constants while replacing native I/O in this pure-state suite.
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    VERIFICATION_RESULT: jest.requireActual<
      typeof import("react-native-purchases")
    >("react-native-purchases").default.VERIFICATION_RESULT,
  },
}));
const { VERIFICATION_RESULT } = Purchases;
let session: SessionSnapshot;
let account: Pick<AccountSession, "status" | "subject" | "accountId">;
let native: ProSessionState;
beforeEach(() => {
  session = { subject: null, accountId: null };
  session = {
    subject: `auth0|${"00000000-0000-4000-8000-000000000001"}`,
    accountId: "00000000-0000-4000-8000-000000000001",
  };
  account = { ...account, ...session };
  account = { status: "authenticated", ...session };
  const active = { "Blockout Pro": entitlement() };
  native = {
    session: { ...session },
    association: "associated",
    operation: "idle",
    customerInfo: customerInfo({
      active,
      all: active,
      verification: VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  };
});
it("gives guests no former entitlement or operation presentation", () => {
  // Given
  const previous = { ...native, operation: "pending" as const };
  // When
  session = { subject: null, accountId: null };
  account = { ...account, ...session };
  account.status = "guest";
  const state = getProState(account, previous);
  // Then
  expect(state).toEqual({ status: "guest" });
});
it("requires usable-account establishment before consuming native state", () => {
  // Given
  session = { subject: null, accountId: null };
  account = { ...account, ...session };
  // When
  const state = getProState(account, native);
  // Then
  expect(state).toEqual({
    status: "unavailable",
    reason: "account",
    operation: "idle",
  });
});
it.each([
  "restoring",
  "authentication-error",
  "reauthentication-required",
  "initialization-error",
] as const)("does not publish rights while authentication is %s", (status) => {
  // Given
  account.status = status;
  // When
  const state = getProState(account, native);
  // Then
  expect(state).toEqual({
    status: "unavailable",
    reason: "account",
    operation: "idle",
  });
});
it.each(["pending", "failed"] as const)(
  "keeps association %s distinct from inactivity",
  (association) => {
    // Given
    const evidence = { ...native, association };
    // When
    const state = getProState(account, evidence);
    // Then
    expect(state).toEqual({
      status: "unavailable",
      reason: `association-${association}`,
      operation: "idle",
    });
  },
);
it("waits for association when there is no evidence for this session", () => {
  // Given
  const evidence = null;
  // When
  const state = getProState(account, evidence);
  // Then
  expect(state).toEqual({
    status: "unavailable",
    reason: "association-pending",
    operation: "idle",
  });
});
it.each([
  "idle",
  "failed",
  "pending",
  "uncertain",
  "completed",
] satisfies ProOperation[])(
  "keeps missing or failed native reads unavailable after an operation marked %s",
  (operation) => {
    // Given
    const evidence = { ...native, customerInfo: null, operation };
    // When
    const state = getProState(account, evidence);
    // Then
    expect(state).toEqual({
      status: "unavailable",
      reason: "customer-info",
      operation,
    });
  },
);
it.each([
  { label: "paid with renewal disabled", values: { willRenew: false } },
  {
    label: "paid with a billing issue",
    values: {
      billingIssueDetectedAt: "2026-01-15T00:00:00Z",
      billingIssueDetectedAtMillis: 1768435200000,
    },
  },
  {
    label: "temporary gift",
    values: { store: "PROMOTIONAL", willRenew: false },
  },
  {
    label: "open-ended gift",
    values: {
      store: "PROMOTIONAL",
      willRenew: false,
      expirationDate: null,
      expirationDateMillis: null,
    },
  },
  {
    label: "unknown native metadata",
    values: {
      store: "UNKNOWN_STORE",
      ownershipType: "UNKNOWN",
      periodType: "UNRECOGNIZED",
      expirationDate: null,
      expirationDateMillis: null,
    },
  },
] satisfies {
  label: string;
  values: Partial<PurchasesEntitlementInfo>;
}[])(
  "preserves SDK-active $label without recalculating dates or inferring paid origin",
  ({ values }) => {
    // Given: dates intentionally precede today; only the SDK decides active/cache validity.
    const right = entitlement(values);
    const active = { "Blockout Pro": right };
    const evidence = {
      ...native,
      customerInfo: customerInfo({
        active,
        all: active,
        verification: VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    };
    // When
    const state = getProState(account, evidence);
    // Then
    expect(state).toEqual({
      status: "active",
      entitlement: right,
      operation: "idle",
    });
    if (state.status === "active") expect(state.entitlement).toBe(right);
  },
);
it("uses the active map rather than historical rights, other entitlements or subscription products", () => {
  // Given
  const info = customerInfo({
    active: {
      "Other entitlement": entitlement({ identifier: "Other entitlement" }),
    },
    all: { "Blockout Pro": entitlement({ isActive: false }) },
    verification: VERIFICATION_RESULT.NOT_REQUESTED,
  });
  const evidence = {
    ...native,
    customerInfo: { ...info, activeSubscriptions: ["monthly"] },
  };
  // When
  const state = getProState(account, evidence);
  // Then
  expect(state).toEqual({ status: "inactive", operation: "idle" });
});
it.each([
  "cancelled",
  "pending",
  "uncertain",
  "failed",
  "completed",
] satisfies ProOperation[])(
  "preserves independent active rights when the operation is %s",
  (operation) => {
    // Given
    const evidence = { ...native, operation };
    // When
    const state = getProState(account, evidence);
    // Then
    expect(state).toEqual({
      status: "active",
      entitlement: native.customerInfo?.entitlements.active["Blockout Pro"],
      operation,
    });
  },
);
it.each([
  "cancelled",
  "pending",
  "uncertain",
  "completed",
] satisfies ProOperation[])(
  "does not invent Pro activation from an operation marked %s",
  (operation) => {
    // Given
    const evidence = {
      ...native,
      operation,
      customerInfo: customerInfo({
        active: {},
        all: {},
        verification: VERIFICATION_RESULT.NOT_REQUESTED,
      }),
    };
    // When
    const state = getProState(account, evidence);
    // Then
    expect(state).toEqual({ status: "inactive", operation });
  },
);
it.each(["00000000-0000-4000-8000-000000000002"])(
  "rejects a late read and operation across logout then account %s",
  async (nextAccount) => {
    // Given: plain native principal snapshots; the native completion is controlled.
    const completion = Promise.withResolvers<ProSessionState>();
    const result = completion.promise.then((evidence) =>
      getProState(account, evidence),
    );
    // When
    session = { subject: null, accountId: null };
    account = { ...account, ...session };
    session = { subject: `auth0|${nextAccount}`, accountId: nextAccount };
    account = { ...account, ...session };
    completion.resolve({ ...native, operation: "completed" });
    // Then
    expect(await result).toEqual({
      status: "unavailable",
      reason: "association-pending",
      operation: "idle",
    });
  },
);
it("discards prior rights immediately on a direct account switch", () => {
  // Given
  const previous = native;
  // When
  session = {
    subject: `auth0|${"00000000-0000-4000-8000-000000000002"}`,
    accountId: "00000000-0000-4000-8000-000000000002",
  };
  account = { ...account, ...session };
  const state = getProState(account, previous);
  // Then
  expect(state).toEqual({
    status: "unavailable",
    reason: "association-pending",
    operation: "idle",
  });
});
