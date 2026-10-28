import type { AccountSession, SessionSnapshot } from "../accounts";
import type { useAccessAdmission } from "../access/queries/use-access-admission";
import type { ProState } from "../pro";

/**
 * Transient result of the native privacy owner for a captured F05 context.
 * The owner establishes applicable treatment, consent and permissions before supplying a mode.
 * Native persistence stays with the SDK; these inputs contain no copied consent strings or age.
 */
export interface AdvertisingChoices {
  readonly session: SessionSnapshot;
  readonly canRequestAds: boolean;
  readonly authorizedMode: "personalized" | "contextual" | "limited" | null;
}

/** Existing owners are read at evaluation; callers must reevaluate before loading or presenting. */
export interface AdvertisingEligibilityInput {
  readonly account: Pick<AccountSession, "status" | "getSnapshot">;
  readonly pro: ProState;
  readonly admission: Pick<ReturnType<typeof useAccessAdmission>, "ordinary">;
  readonly choices: AdvertisingChoices | null;
}

/** Permissions only: no entitlement exemption, sporting-access decision or prepared-ad guarantee. */
export interface AdvertisingEligibility {
  readonly canPrepareChoices: boolean;
  readonly canRequestAds: boolean;
  readonly canDisplayAds: boolean;
}

/**
 * Derives current advertising permissions without retaining rights, choices or a refresh clock.
 * Unknown signed-in rights may prepare privacy choices but authorize no advertising. Guests need
 * no entitlement lookup. An active entitlement avoids new prompts; existing privacy controls remain
 * independent. Loading and presentation also require current native choices and F12 admission.
 */
export function getAdvertisingEligibility({
  account,
  pro,
  admission,
  choices,
}: AdvertisingEligibilityInput): AdvertisingEligibility {
  const current = account.getSnapshot();
  const canPrepareChoices = admission.ordinary && pro.status !== "active";
  const canServeAds =
    admission.ordinary &&
    (pro.status === "guest" || pro.status === "inactive") &&
    choices !== null &&
    choices.session.generation === current.generation &&
    choices.session.accountId === current.accountId &&
    choices.canRequestAds &&
    choices.authorizedMode !== null;

  return {
    canPrepareChoices,
    canRequestAds: canServeAds,
    canDisplayAds: canServeAds,
  };
}
