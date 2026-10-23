import Purchases from "react-native-purchases";
import { canPurchasePro, loadProOffering } from "../pro-offering";
import { entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import type { ProState } from "../pro-state";
import { v2Offering } from "../test-support/offering";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

it("selects only the configured V2 offering and preserves its native localized products", async () => {
  // Given
  const v1 = {
    ...v2Offering,
    identifier: "default",
    serverDescription: "V1",
    metadata: {},
    availablePackages: [],
  };
  const v2 = v2Offering;
  mockPurchases.getOfferings.mockResolvedValue({
    current: v1,
    all: { default: v1, v2 },
  });

  // When
  const offering = await loadProOffering("v2");

  // Then
  expect(offering).toBe(v2);
  expect(offering?.availablePackages[0].product.priceString).toBe("4,29 €");
  expect(offering?.availablePackages[0].product.subscriptionPeriod).toBe("P1M");
  expect(Purchases.getOfferings).toHaveBeenCalledTimes(1);
});

it("allows a new explicit purchase after cancellation or definite failure only for inactive rights", () => {
  // Given / When / Then
  for (const operation of ["idle", "cancelled", "failed"] as const) {
    expect(canPurchasePro({ status: "inactive", operation })).toBe(true);
  }
});

it("distinguishes missing configuration or offer from failed retrieval without a current fallback", async () => {
  // Given
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });

  // When / Then
  await expect(loadProOffering("")).resolves.toBeNull();
  expect(Purchases.getOfferings).not.toHaveBeenCalled();
  await expect(loadProOffering("v2")).resolves.toBeNull();
  mockPurchases.getOfferings.mockRejectedValue(
    new Error("private provider data"),
  );
  await expect(loadProOffering("v2")).rejects.toThrow(
    "Pro offering unavailable",
  );
});

it.each([
  { status: "guest" },
  { status: "unavailable", reason: "customer-info", operation: "idle" },
  { status: "active", entitlement: entitlement(), operation: "idle" },
  ...(
    [
      "purchasing",
      "pending",
      "uncertain",
      "purchased",
      "already-owned",
    ] as const
  ).map((operation) => ({ status: "inactive" as const, operation })),
] satisfies ProState[])(
  "does not encourage purchase for $status / $operation",
  (state) => {
    // Given / When / Then
    expect(canPurchasePro(state)).toBe(false);
  },
);
