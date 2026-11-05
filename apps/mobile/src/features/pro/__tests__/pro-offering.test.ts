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
  expect(Purchases.getOfferings).toHaveBeenCalledTimes(1);
});

it("allows a new explicit purchase after cancellation or definite failure only for inactive rights", () => {
  for (const operation of ["idle", "cancelled", "failed"] as const) {
    // Given
    const state = { status: "inactive", operation } as const;

    // When
    const allowed = canPurchasePro(state);

    // Then
    expect(allowed).toBe(true);
  }
});

it("distinguishes missing configuration or offer from failed retrieval without a current fallback", async () => {
  // Given
  mockPurchases.getOfferings.mockResolvedValue({ current: null, all: {} });

  // When
  const unconfiguredOffering = await loadProOffering("");

  // Then
  expect(unconfiguredOffering).toBeNull();
  expect(Purchases.getOfferings).not.toHaveBeenCalled();

  // When
  const missingOffering = await loadProOffering("v2");

  // Then
  expect(missingOffering).toBeNull();

  // Given
  mockPurchases.getOfferings.mockRejectedValue(
    new Error("private provider data"),
  );

  // When
  const failedOffering = loadProOffering("v2");

  // Then
  await expect(failedOffering).rejects.toThrow("Pro offering unavailable");
});

it.each([
  { label: "guest rights", state: { status: "guest" } },
  {
    label: "unavailable rights",
    state: {
      status: "unavailable",
      reason: "customer-info",
      operation: "idle",
    },
  },
  {
    label: "active rights",
    state: { status: "active", entitlement: entitlement(), operation: "idle" },
  },
  ...(
    [
      "purchasing",
      "pending",
      "uncertain",
      "purchased",
      "already-owned",
    ] as const
  ).map((operation) => ({
    label: `inactive rights during ${operation}`,
    state: { status: "inactive" as const, operation },
  })),
] satisfies { label: string; state: ProState }[])(
  "does not encourage purchase for $label",
  ({ state }) => {
    // Given: the table supplies the rights and operation state.

    // When
    const allowed = canPurchasePro(state);

    // Then
    expect(allowed).toBe(false);
  },
);
