import { waitFor } from "@testing-library/react-native";
import { PURCHASES_ERROR_CODE } from "@revenuecat/purchases-typescript-internal";
import { createProSession } from "../pro-session";
import { purchaseErrorOutcome } from "../pro-operations";
import { mockPurchases } from "../test-support/native-purchases";
import { customerInfo, entitlement } from "../test-support/customer-info";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { extra: { revenueCat: { iosApiKey: "test_public" } } },
  },
}));
jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const session = {
  generation: "purchase-A",
  accountId: "00000000-0000-4000-8000-000000000251",
};
const inactive = customerInfo({
  active: {},
  all: {},
  verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
});

beforeEach(() => {
  mockPurchases.isConfigured.mockResolvedValue(true);
  mockPurchases.getCustomerInfo.mockReset().mockResolvedValue(inactive);
});

it.each([
  [PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR, "cancelled"],
  [PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR, "pending"],
  [PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR, "failed"],
  [PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR, "already-owned"],
  [PURCHASES_ERROR_CODE.OPERATION_ALREADY_IN_PROGRESS_ERROR, "uncertain"],
  [PURCHASES_ERROR_CODE.NETWORK_ERROR, "uncertain"],
  [PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR, "uncertain"],
  [PURCHASES_ERROR_CODE.UNKNOWN_ERROR, "uncertain"],
])(
  "maps native error %s to %s without inferring entitlement",
  (code, expected) => {
    // Given / When / Then
    expect(purchaseErrorOutcome(code)).toBe(expected);
  },
);

it("refuses duplicate starts and keeps a lost response uncertain after closure and verification", async () => {
  // Given
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.association).toBe("associated"),
  );

  // When
  const first = owner.beginPurchase(session);
  const second = owner.beginPurchase(session);
  await owner.dismissPresentation(session);
  await owner.refresh(session);

  // Then
  expect(first).toBe(true);
  expect(second).toBe(false);
  expect(owner.getSnapshot().evidence?.operation).toBe("uncertain");
  expect(owner.beginPurchase(session)).toBe(false);
});

it("keeps confirmed payment separate from activation when verification is unavailable", async () => {
  // Given
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.association).toBe("associated"),
  );
  owner.beginPurchase(session);
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("private provider data"),
  );

  // When
  await owner.completeOperation(session, "purchased", inactive);

  // Then
  expect(owner.getSnapshot().evidence?.operation).toBe("purchased");
  expect(owner.getSnapshot().verificationFailed).toBe(true);
  expect(owner.beginPurchase(session)).toBe(false);
});

it("accepts the SDK completion's active entitlement immediately and preserves gifts on cancellation", async () => {
  // Given
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.association).toBe("associated"),
  );
  const active = {
    "Blockout Pro": entitlement({ store: "PROMOTIONAL", willRenew: false }),
  };
  const gifted = customerInfo({
    active,
    all: active,
    verification: mockPurchases.VERIFICATION_RESULT.NOT_REQUESTED,
  });
  mockPurchases.getCustomerInfo.mockRejectedValue(
    new Error("read unavailable"),
  );

  // When
  await owner.completeOperation(session, "purchased", gifted);
  await owner.completeOperation(session, "cancelled");

  // Then
  expect(owner.getSnapshot().evidence?.customerInfo).toBe(gifted);
  expect(owner.beginPurchase(session)).toBe(false);
});

it("rejects old starts and completions across A → guest → A and restarts from native state", async () => {
  // Given
  const owner = createProSession();
  owner.setTarget(session);
  await waitFor(() =>
    expect(owner.getSnapshot().evidence?.association).toBe("associated"),
  );
  owner.beginPurchase(session);

  // When
  owner.setTarget({ generation: "guest", accountId: null });
  await owner.completeOperation(session, "purchased", inactive);
  const restarted = createProSession();
  restarted.setTarget({ ...session, generation: "restart-A" });
  await waitFor(() =>
    expect(restarted.getSnapshot().evidence?.association).toBe("associated"),
  );

  // Then
  expect(owner.getSnapshot().evidence).toBeNull();
  expect(owner.beginPurchase(session)).toBe(false);
  expect(restarted.getSnapshot().evidence?.operation).toBe("idle");
  expect(mockPurchases.getCustomerInfo).toHaveBeenCalledTimes(2);
});
