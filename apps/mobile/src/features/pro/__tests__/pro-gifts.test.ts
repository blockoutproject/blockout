import { waitFor } from "@testing-library/react-native";
import { createProSession } from "../pro-session";
import { getProState } from "../pro-state";
import { customerInfo, entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const session = {
  subject: "auth0|gift-owner",
  accountId: "00000000-0000-4000-8000-000000000320",
};
const account = { status: "authenticated", ...session } as const;

beforeEach(() => {
  mockPurchases.isConfigured.mockReset().mockResolvedValue(true);
});

it.each([
  {
    label: "temporary",
    expirationDate: "2026-02-01T00:00:00Z",
    expirationDateMillis: 1769904000000,
  },
  { label: "open-ended", expirationDate: null, expirationDateMillis: null },
])(
  "consumes SDK-active $label gifts without inferring expiry or a billed renewal",
  async (validity) => {
    // Given: the old date deliberately leaves validity with the SDK rather than the local clock.
    const gift = entitlement({
      store: "PROMOTIONAL",
      willRenew: false,
      expirationDate: validity.expirationDate,
      expirationDateMillis: validity.expirationDateMillis,
    });
    const info = customerInfo({
      active: { "Blockout Pro": gift },
      all: { "Blockout Pro": gift },
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    });
    mockPurchases.logIn
      .mockReset()
      .mockResolvedValue({ customerInfo: info, created: false });
    const owner = createProSession();

    // When
    owner.setTarget(session);
    await waitFor(() =>
      expect(owner.getSnapshot().evidence?.association).toBe("associated"),
    );
    const state = getProState(account, owner.getSnapshot().evidence);

    // Then
    expect(state).toMatchObject({ status: "active", entitlement: gift });
    expect(info.activeSubscriptions).toEqual([]);
    expect(gift.willRenew).toBe(false);
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
  },
);

it("retains independent paid rights and their native billing facts when the SDK stops supplying an active gift", async () => {
  // Given
  const gift = entitlement({
    store: "PROMOTIONAL",
    productIdentifier: "gift",
    willRenew: false,
  });
  const paid = entitlement({
    store: "APP_STORE",
    productIdentifier: "monthly",
  });
  const initial = {
    ...customerInfo({
      active: { "Blockout Pro": gift },
      all: { "Blockout Pro": gift },
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    }),
    activeSubscriptions: ["monthly"],
    allPurchasedProductIdentifiers: ["monthly", "gift"],
    allExpirationDates: {
      monthly: paid.expirationDate,
      gift: gift.expirationDate,
    },
  };
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: initial, created: false });
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(initial),
  );
  const current = {
    ...initial,
    entitlements: {
      active: { "Blockout Pro": paid },
      all: { "Blockout Pro": paid },
      verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
    },
  };
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(current);

  // When
  await owner.refresh(session);

  // Then
  expect(getProState(account, owner.getSnapshot().evidence)).toMatchObject({
    status: "active",
    entitlement: paid,
  });
  expect(owner.getSnapshot().evidence?.customerInfo).toBe(current);
  expect(current.activeSubscriptions).toEqual(["monthly"]);
  expect(current.allExpirationDates.monthly).toBe(
    initial.allExpirationDates.monthly,
  );
  expect(paid.willRenew).toBe(true);
});

it("preserves an independent gift on restoration, then accepts SDK-inactive gift loss", async () => {
  // Given
  const gift = entitlement({
    store: "PROMOTIONAL",
    productIdentifier: "gift",
    willRenew: false,
  });
  const info = customerInfo({
    active: { "Blockout Pro": gift },
    all: { "Blockout Pro": gift },
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.logIn
    .mockReset()
    .mockResolvedValue({ customerInfo: info, created: false });
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.customerInfo).toBe(info),
  );

  // When
  await owner.completeOperation(session, "restored", info);

  // Then
  expect(getProState(account, owner.getSnapshot().evidence)).toMatchObject({
    status: "active",
    entitlement: gift,
  });

  // When
  const inactive = customerInfo({
    active: {},
    all: { "Blockout Pro": { ...gift, isActive: false } },
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(inactive);
  await owner.refresh(session);

  // Then
  expect(getProState(account, owner.getSnapshot().evidence)).toMatchObject({
    status: "inactive",
  });
});
