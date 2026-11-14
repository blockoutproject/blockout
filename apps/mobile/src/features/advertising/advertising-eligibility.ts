import type { AccountSession } from "@/features/accounts";
import type { ProState } from "@/features/pro";

/**
 * Transient result of the installation's native privacy owner.
 * The owner establishes applicable treatment, consent and permissions before supplying a mode.
 * Native persistence stays with the SDK; these inputs contain no copied consent strings or age.
 */
export interface AdvertisingChoices {
  readonly canRequestAds: boolean;
  readonly authorizedMode: "personalized" | "contextual" | "limited" | null;
}

/** Existing owners are read at evaluation; callers must reevaluate before loading or presenting. */
export interface AdvertisingEligibilityInput {
  readonly account: Pick<AccountSession, "status" | "subject" | "accountId">;
  readonly pro: ProState;
  readonly admission: { readonly ordinary: boolean };
  readonly choices: AdvertisingChoices | null;
}

/** Permissions only: no entitlement exemption, sporting-access decision or prepared-ad guarantee. */
export interface AdvertisingEligibility {
  readonly canServeAds: boolean;
}

/**
 * Derives current advertising permissions without retaining rights, choices or a refresh clock.
 * Unknown signed-in rights may prepare privacy choices but authorize no advertising. Guests need
 * no entitlement lookup. An active entitlement avoids new prompts; existing privacy controls remain
 * independent. Loading and presentation also require current native choices and F12 admission.
 */
export function getAdvertisingEligibility({
  pro,
  admission,
  choices,
}: AdvertisingEligibilityInput): AdvertisingEligibility {
  const canServeAds =
    admission.ordinary &&
    (pro.status === "guest" || pro.status === "inactive") &&
    choices !== null &&
    choices.canRequestAds &&
    choices.authorizedMode !== null;
  return { canServeAds };
}
