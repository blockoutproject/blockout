import type { ProState } from "@/features/pro";
import { entitlement } from "@/features/pro/test-support/customer-info";
import {
  isAdvertisingEligible,
  type AdvertisingEligibilityInput,
} from "../advertising-eligibility";

it.each([
  { label: "guest", pro: { status: "guest" }, allowed: true },
  {
    label: "SDK-inactive",
    pro: { status: "inactive", operation: "idle" },
    allowed: true,
  },
  {
    label: "SDK-active",
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
    allowed: false,
  },
  {
    label: "unavailable",
    pro: { status: "unavailable", reason: "customer-info", operation: "idle" },
    allowed: false,
  },
] satisfies { label: string; pro: ProState; allowed: boolean }[])(
  "uses current $label rights for sporting advertising eligibility",
  ({ pro, allowed }) => {
    // Given: the table supplies current RevenueCat evidence for an admitted adult.

    // When
    const eligible = isAdvertisingEligible({
      pro,
      admission: { ordinary: true },
      category: "adult",
    });

    // Then
    expect(eligible).toBe(allowed);
  },
);

it.each([
  {
    label: "blocked admission",
    ordinary: false,
    category: "adult",
    allowed: false,
  },
  { label: "unknown age", ordinary: true, category: null, allowed: false },
  { label: "under 16", ordinary: true, category: "under16", allowed: false },
  { label: "16–17", ordinary: true, category: "16–17", allowed: true },
] satisfies {
  label: string;
  ordinary: boolean;
  category: AdvertisingEligibilityInput["category"];
  allowed: boolean;
}[])(
  "applies age and admission for $label",
  ({ ordinary, category, allowed }) => {
    // Given: the table supplies current admission and the installation's age treatment.

    // When
    const eligible = isAdvertisingEligible({
      pro: { status: "guest" },
      admission: { ordinary },
      category,
    });

    // Then
    expect(eligible).toBe(allowed);
  },
);
