import Purchases from "react-native-purchases";
import { canShowProOffer, loadProOffering } from "../pro-offering";
import { entitlement } from "../test-support/customer-info";
import { mockPurchases } from "../test-support/native-purchases";
import type { ProState } from "../pro-state";
import { defaultOffering } from "../test-support/offering";

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: jest.requireActual("../test-support/native-purchases").mockPurchases,
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

it("selects only the explicitly configured offering and preserves its native localized products", async () => {
  // Given
  const otherOffering = {
    ...defaultOffering,
    identifier: "other",
    serverDescription: "Other offering",
    metadata: {},
    availablePackages: [],
  };
  mockPurchases.getOfferings.mockResolvedValue({
    current: otherOffering,
    all: { other: otherOffering, default: defaultOffering },
  });

  // When
  const offering = await loadProOffering("default");

  // Then
  expect(offering).toBe(defaultOffering);
  expect(Purchases.getOfferings).toHaveBeenCalledTimes(1);
});

it("shows the existing banner after cancellation or ordinary failure only for free rights", () => {
  for (const operation of ["idle", "cancelled", "failed"] as const) {
    // Given
    const state = { status: "inactive", operation } as const;

    // When
    const allowed = canShowProOffer(state);

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
  const missingOffering = await loadProOffering("default");

  // Then
  expect(missingOffering).toBeNull();

  // Given
  mockPurchases.getOfferings.mockRejectedValue(
    new Error("private provider data"),
  );

  // When
  const failedOffering = loadProOffering("default");

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
  ...(["pending", "purchased", "already-owned"] as const).map((operation) => ({
    label: `inactive rights during ${operation}`,
    state: { status: "inactive" as const, operation },
  })),
] satisfies { label: string; state: ProState }[])(
  "does not encourage purchase for $label",
  ({ state }) => {
    // Given: the table supplies the rights and operation state.

    // When
    const allowed = canShowProOffer(state);

    // Then
    expect(allowed).toBe(false);
  },
);

it("rejects an explicit offering without purchasable packages rather than using current", async () => {
  // Given
  const empty = { ...defaultOffering, availablePackages: [] };
  mockPurchases.getOfferings.mockResolvedValue({
    current: defaultOffering,
    all: { default: empty },
  });

  // When
  const offering = await loadProOffering("default");

  // Then
  expect(offering).toBeNull();
});
