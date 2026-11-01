import type { SessionSnapshot, AccountSession } from "../../accounts";
import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
} from "react-native-purchases";
import { getProState, type ProSessionState } from "../../pro/pro-state";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { getAdvertisingEligibility } from "../advertising-eligibility";

// Only native SDK I/O is replaced; plain native principal snapshots and the real F09 state projection are used.
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    VERIFICATION_RESULT: jest.requireActual<
      typeof import("react-native-purchases")
    >("react-native-purchases").default.VERIFICATION_RESULT,
  },
}));
const a = "00000000-0000-4000-8000-000000000001";
const b = "00000000-0000-4000-8000-000000000002";
/** Synthetic native evidence attributed to the captured F05 session, without SDK freshness simulation. */
function nativeState(
  session: ProSessionState["session"],
  right: PurchasesEntitlementInfo | null = null,
): ProSessionState {
  const active: CustomerInfo["entitlements"]["active"] = right
    ? { "Blockout Pro": right }
    : {};
  return {
    session,
    association: "associated",
    operation: "idle",
    customerInfo: customerInfo({
      active,
      all: active,
      verification: Purchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
  };
}
let session: SessionSnapshot;
let account: Pick<AccountSession, "status" | "subject" | "accountId">;
beforeEach(() => {
  session = { subject: null, accountId: null };
  session = { subject: `auth0|${a}`, accountId: a };
  account = { ...account, ...session };
  account = { status: "authenticated", ...session };
});
it("lets an admitted guest prepare choices and serve ads without any account entitlement read", () => {
  // Given
  session = { subject: null, accountId: null };
  account = { ...account, ...session };
  account.status = "guest";
  // When
  const eligibility = getAdvertisingEligibility({
    account,
    pro: getProState(account, null),
    admission: { ordinary: true },
    choices: {
      session: { ...session },
      canRequestAds: true,
      authorizedMode: "limited",
    },
  });
  // Then
  expect(eligibility).toEqual({
    canServeAds: true,
  });
});
it.each([
  { label: "paid", right: entitlement() },
  {
    label: "gifted",
    right: entitlement({
      store: "PROMOTIONAL",
      expirationDate: null,
      expirationDateMillis: null,
    }),
  },
])(
  "suppresses advertising and unnecessary choice preparation for current $label Pro",
  ({ right }) => {
    // Given: SDK-active rights remain authoritative even when fixture dates precede today.
    const nativePro = nativeState({ ...session }, right);
    // When
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, nativePro),
      admission: { ordinary: true },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode: "personalized",
      },
    });
    // Then
    expect(eligibility).toEqual({
      canServeAds: false,
    });
  },
);
it.each(["absent", "pending", "failed", "missing-info"] as const)(
  "allows independent privacy preparation but no ads when signed-in native rights are %s",
  (state) => {
    // Given
    const evidence = nativeState({ ...session });
    const nativePro =
      state === "absent"
        ? null
        : {
            ...evidence,
            association:
              state === "pending" || state === "failed"
                ? state
                : evidence.association,
            customerInfo:
              state === "missing-info" ? null : evidence.customerInfo,
          };
    // When
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, nativePro),
      admission: { ordinary: true },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode: "contextual",
      },
    });
    // Then
    expect(eligibility).toEqual({
      canServeAds: false,
    });
  },
);
it.each([
  "restoring",
  "authenticating",
  "signing-out",
  "authentication-error",
  "reauthentication-required",
  "initialization-error",
] as const)(
  "does not infer a guest or free account while F05 is %s",
  (status) => {
    // Given
    account.status = status;
    // When
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, nativeState({ ...session })),
      admission: { ordinary: true },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });
    // Then
    expect(eligibility.canServeAds).toBe(false);
  },
);
it.each(["personalized", "contextual", "limited"] as const)(
  "permits the explicitly authorized %s mode for current SDK-inactive rights",
  (authorizedMode) => {
    // Given
    const nativePro = nativeState({ ...session });
    // When
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, nativePro),
      admission: { ordinary: true },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode,
      },
    });
    // Then
    expect(eligibility).toEqual({
      canServeAds: true,
    });
  },
);
describe.each(["guest", "inactive"] as const)(
  "%s advertising admission",
  (state) => {
    it.each([
      {
        label: "blocked F12 admission",
        admission: { ordinary: false },
        choices: { canRequestAds: true, authorizedMode: "limited" },
      },
      {
        label: "missing native choices",
        admission: { ordinary: true },
        choices: null,
      },
      {
        label: "native request refusal",
        admission: { ordinary: true },
        choices: { canRequestAds: false, authorizedMode: "limited" },
      },
      {
        label: "no authorized advertising mode",
        admission: { ordinary: true },
        choices: { canRequestAds: true, authorizedMode: null },
      },
    ] as const)("rejects $label", ({ admission, choices }) => {
      // Given
      if (state === "guest") {
        session = { subject: null, accountId: null };
        account = { ...account, ...session };
        account.status = "guest";
      }
      const nativePro = state === "guest" ? null : nativeState({ ...session });
      // When
      const eligibility = getAdvertisingEligibility({
        account,
        pro: getProState(account, nativePro),
        admission,
        choices: choices ? { ...choices, session: { ...session } } : null,
      });
      // Then
      expect(eligibility).toEqual({
        canServeAds: false,
      });
    });
  },
);
it.each(["active", "inactive"] as const)(
  "rejects A's obsolete %s rights after switching directly to B",
  (state) => {
    // Given
    const previous = nativeState(
      { ...session },
      state === "active" ? entitlement() : null,
    );
    // When
    session = { subject: `auth0|${b}`, accountId: b };
    account = { ...account, ...session };
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, previous),
      admission: { ordinary: true },
      choices: {
        session: { ...session },
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });
    // Then: B has neither A's exemption nor permission to serve ads while its own rights are unknown.
    expect(eligibility).toEqual({
      canServeAds: false,
    });
  },
);

it.each(["direct-switch", "guest-return"] as const)(
  "rejects obsolete native-choice preparation after %s even with current inactive rights",
  (transition) => {
    // Given
    const choices = {
      session: { ...session },
      canRequestAds: true,
      authorizedMode: "limited" as const,
    };
    // When
    if (transition === "guest-return") {
      session = { subject: null, accountId: null };
      account = { ...account, ...session };
    }
    session = {
      subject: `auth0|${transition === "direct-switch" ? b : a}`,
      accountId: transition === "direct-switch" ? b : a,
    };
    account = { ...account, ...session };
    const eligibility = getAdvertisingEligibility({
      account,
      pro: getProState(account, nativeState({ ...session })),
      admission: { ordinary: true },
      choices: transition === "guest-return" ? null : choices,
    });
    // Then
    expect(eligibility).toEqual({
      canServeAds: false,
    });
  },
);
it("requires current choices when a guest becomes an established account during native account establishment", () => {
  // Given: business account establishment changes the privacy input without a client epoch.
  session = { subject: null, accountId: null };
  account = { ...account, ...session };
  const choices = {
    session: { ...session },
    canRequestAds: true,
    authorizedMode: "limited" as const,
  };
  // When
  session = { subject: `auth0|${a}`, accountId: a };
  account = { ...account, ...session };
  const eligibility = getAdvertisingEligibility({
    account,
    pro: getProState(account, nativeState({ ...session })),
    admission: { ordinary: true },
    choices,
  });
  // Then
  expect(eligibility).toEqual({
    canServeAds: false,
  });
});
it("rechecks changed native rights before presentation without retaining a former permission", () => {
  // Given
  const input = {
    account,
    pro: getProState(account, nativeState({ ...session })),
    admission: { ordinary: true },
    choices: {
      session: { ...session },
      canRequestAds: true,
      authorizedMode: "limited" as const,
    },
  };
  const inactive = getAdvertisingEligibility(input);
  // When
  const active = getAdvertisingEligibility({
    ...input,
    pro: getProState(account, nativeState({ ...session }, entitlement())),
  });
  // Then
  expect(inactive.canServeAds).toBe(true);
  expect(active).toEqual({
    canServeAds: false,
  });
});
