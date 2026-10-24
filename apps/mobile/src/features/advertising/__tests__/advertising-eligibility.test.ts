import Purchases, {
  type CustomerInfo,
  type PurchasesEntitlementInfo,
} from "react-native-purchases";
import { createSessionGeneration, type AccountSession } from "../../accounts";
import type { ProSessionState } from "../../pro/pro-state";
import {
  customerInfo,
  entitlement,
} from "../../pro/test-support/customer-info";
import { getAdvertisingEligibility } from "../advertising-eligibility";

// Only native SDK I/O is replaced; F05 generations and F09's state projection are real.
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

let session: ReturnType<typeof createSessionGeneration>;
let account: Pick<AccountSession, "status" | "getSnapshot">;

beforeEach(() => {
  session = createSessionGeneration();
  session.setAccount(session.getSnapshot().generation, a);
  account = { status: "authenticated", getSnapshot: session.getSnapshot };
});

it("lets an admitted guest prepare choices and serve ads without any account entitlement read", () => {
  // Given
  session.invalidate();
  account.status = "guest";

  // When
  const eligibility = getAdvertisingEligibility({
    account,
    nativePro: null,
    admission: { ordinary: true },
    choices: {
      session: session.getSnapshot(),
      canRequestAds: true,
      authorizedMode: "limited",
    },
  });

  // Then
  expect(eligibility).toEqual({
    canPrepareChoices: true,
    canRequestAds: true,
    canDisplayAds: true,
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
    const nativePro = nativeState(session.getSnapshot(), right);

    // When
    const eligibility = getAdvertisingEligibility({
      account,
      nativePro,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "personalized",
      },
    });

    // Then
    expect(eligibility).toEqual({
      canPrepareChoices: false,
      canRequestAds: false,
      canDisplayAds: false,
    });
  },
);

it.each(["absent", "pending", "failed", "missing-info"] as const)(
  "allows independent privacy preparation but no ads when signed-in native rights are %s",
  (state) => {
    // Given
    const evidence = nativeState(session.getSnapshot());
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
      nativePro,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "contextual",
      },
    });

    // Then
    expect(eligibility).toEqual({
      canPrepareChoices: true,
      canRequestAds: false,
      canDisplayAds: false,
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
      nativePro: nativeState(session.getSnapshot()),
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });

    // Then
    expect(eligibility.canRequestAds).toBe(false);
    expect(eligibility.canDisplayAds).toBe(false);
  },
);

it.each(["personalized", "contextual", "limited"] as const)(
  "permits the explicitly authorized %s mode for current SDK-inactive rights",
  (authorizedMode) => {
    // Given
    const nativePro = nativeState(session.getSnapshot());

    // When
    const eligibility = getAdvertisingEligibility({
      account,
      nativePro,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode,
      },
    });

    // Then
    expect(eligibility).toEqual({
      canPrepareChoices: true,
      canRequestAds: true,
      canDisplayAds: true,
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
        canPrepareChoices: false,
      },
      {
        label: "missing native choices",
        admission: { ordinary: true },
        choices: null,
        canPrepareChoices: true,
      },
      {
        label: "native request refusal",
        admission: { ordinary: true },
        choices: { canRequestAds: false, authorizedMode: "limited" },
        canPrepareChoices: true,
      },
      {
        label: "no authorized advertising mode",
        admission: { ordinary: true },
        choices: { canRequestAds: true, authorizedMode: null },
        canPrepareChoices: true,
      },
    ] as const)(
      "rejects $label",
      ({ admission, choices, canPrepareChoices }) => {
        // Given
        if (state === "guest") {
          session.invalidate();
          account.status = "guest";
        }
        const nativePro =
          state === "guest" ? null : nativeState(session.getSnapshot());

        // When
        const eligibility = getAdvertisingEligibility({
          account,
          nativePro,
          admission,
          choices: choices
            ? { ...choices, session: session.getSnapshot() }
            : null,
        });

        // Then
        expect(eligibility).toEqual({
          canPrepareChoices,
          canRequestAds: false,
          canDisplayAds: false,
        });
      },
    );
  },
);

it.each(["active", "inactive"] as const)(
  "rejects A's obsolete %s rights after switching directly to B",
  (state) => {
    // Given
    const previous = nativeState(
      session.getSnapshot(),
      state === "active" ? entitlement() : null,
    );

    // When
    session.setAccount(session.getSnapshot().generation, b);
    const eligibility = getAdvertisingEligibility({
      account,
      nativePro: previous,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });

    // Then: B has neither A's exemption nor permission to serve ads while its own rights are unknown.
    expect(eligibility).toEqual({
      canPrepareChoices: true,
      canRequestAds: false,
      canDisplayAds: false,
    });
  },
);

it.each(["active", "inactive"] as const)(
  "reassesses A → guest → A without inheriting A's former %s rights",
  (state) => {
    // Given
    const previous = nativeState(
      session.getSnapshot(),
      state === "active" ? entitlement() : null,
    );
    session.invalidate();
    account.status = "guest";
    const guest = getAdvertisingEligibility({
      account,
      nativePro: previous,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });

    // When
    session.setAccount(session.getSnapshot().generation, a);
    account.status = "authenticated";
    const returned = getAdvertisingEligibility({
      account,
      nativePro: previous,
      admission: { ordinary: true },
      choices: {
        session: session.getSnapshot(),
        canRequestAds: true,
        authorizedMode: "limited",
      },
    });

    // Then
    expect(guest).toEqual({
      canPrepareChoices: true,
      canRequestAds: true,
      canDisplayAds: true,
    });
    expect(returned).toEqual({
      canPrepareChoices: true,
      canRequestAds: false,
      canDisplayAds: false,
    });
  },
);

it.each(["direct-switch", "guest-return"] as const)(
  "rejects obsolete native-choice preparation after %s even with current inactive rights",
  (transition) => {
    // Given
    const choices = {
      session: session.getSnapshot(),
      canRequestAds: true,
      authorizedMode: "limited" as const,
    };

    // When
    if (transition === "guest-return") session.invalidate();
    session.setAccount(
      session.getSnapshot().generation,
      transition === "direct-switch" ? b : a,
    );
    const eligibility = getAdvertisingEligibility({
      account,
      nativePro: nativeState(session.getSnapshot()),
      admission: { ordinary: true },
      choices,
    });

    // Then
    expect(eligibility).toEqual({
      canPrepareChoices: true,
      canRequestAds: false,
      canDisplayAds: false,
    });
  },
);

it("requires current choices when a guest becomes an established account within the same generation", () => {
  // Given: F05 intentionally retains the generation during first account establishment.
  session.invalidate();
  const choices = {
    session: session.getSnapshot(),
    canRequestAds: true,
    authorizedMode: "limited" as const,
  };

  // When
  session.setAccount(session.getSnapshot().generation, a);
  const eligibility = getAdvertisingEligibility({
    account,
    nativePro: nativeState(session.getSnapshot()),
    admission: { ordinary: true },
    choices,
  });

  // Then
  expect(eligibility).toEqual({
    canPrepareChoices: true,
    canRequestAds: false,
    canDisplayAds: false,
  });
});

it("rechecks changed native rights before presentation without retaining a former permission", () => {
  // Given
  const input = {
    account,
    nativePro: nativeState(session.getSnapshot()),
    admission: { ordinary: true },
    choices: {
      session: session.getSnapshot(),
      canRequestAds: true,
      authorizedMode: "limited" as const,
    },
  };
  const inactive = getAdvertisingEligibility(input);

  // When
  const active = getAdvertisingEligibility({
    ...input,
    nativePro: nativeState(session.getSnapshot(), entitlement()),
  });

  // Then
  expect(inactive.canRequestAds).toBe(true);
  expect(inactive.canDisplayAds).toBe(true);
  expect(active).toEqual({
    canPrepareChoices: false,
    canRequestAds: false,
    canDisplayAds: false,
  });
});
