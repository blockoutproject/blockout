import type { ProState } from "@/features/pro";
import { entitlement } from "@/features/pro/test-support/customer-info";
import {
  getAdvertisingEligibility,
  type AdvertisingEligibilityInput,
} from "../advertising-eligibility";

const account = {
  status: "authenticated",
  subject: "auth0|advertising-account",
  accountId: "00000000-0000-4000-8000-000000000001",
} as const;
const authorizedChoices = {
  canRequestAds: true,
  authorizedMode: "limited",
} as const;

it.each([
  {
    label: "guest",
    account: { status: "guest", subject: null, accountId: null },
    pro: { status: "guest" },
    allowed: true,
  },
  {
    label: "SDK-inactive",
    account,
    pro: { status: "inactive", operation: "idle" },
    allowed: true,
  },
  {
    label: "SDK-active",
    account,
    pro: { status: "active", entitlement: entitlement(), operation: "idle" },
    allowed: false,
  },
  {
    label: "unavailable",
    account,
    pro: { status: "unavailable", reason: "customer-info", operation: "idle" },
    allowed: false,
  },
] satisfies {
  label: string;
  account: AdvertisingEligibilityInput["account"];
  pro: ProState;
  allowed: boolean;
}[])(
  "allows advertising according to current $label rights",
  ({ account, pro, allowed }) => {
    // Given: F09 owns the SDK evidence and supplies its current public result.

    // When
    const eligibility = getAdvertisingEligibility({
      account,
      pro,
      admission: { ordinary: true },
      choices: authorizedChoices,
    });

    // Then
    expect(eligibility.canServeAds).toBe(allowed);
  },
);

it.each([
  {
    label: "blocked application admission",
    admission: { ordinary: false },
    choices: authorizedChoices,
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
] satisfies {
  label: string;
  admission: AdvertisingEligibilityInput["admission"];
  choices: AdvertisingEligibilityInput["choices"];
}[])("refuses advertising with $label", ({ admission, choices }) => {
  // Given
  const pro: ProState = { status: "inactive", operation: "idle" };

  // When
  const eligibility = getAdvertisingEligibility({
    account,
    pro,
    admission,
    choices,
  });

  // Then
  expect(eligibility.canServeAds).toBe(false);
});
