import type { ProState } from "@/features/pro";
import type { AgeDeclaration } from "./age-declaration";

/** Current installation treatment, RevenueCat evidence and public access at the moment of use. */
export interface AdvertisingEligibilityInput {
  readonly pro: ProState;
  readonly admission: { readonly ordinary: boolean };
  readonly category: AgeDeclaration["category"] | null;
}

/** Consent and ad readiness govern requests and presentation, independently of the sporting count. */
export function isAdvertisingEligible({
  pro,
  admission,
  category,
}: AdvertisingEligibilityInput): boolean {
  return (
    admission.ordinary &&
    (pro.status === "guest" || pro.status === "inactive") &&
    (category === "adult" || category === "16–17")
  );
}
