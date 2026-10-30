import * as Sentry from "@sentry/react-native";
import Purchases, { type PurchasesOffering } from "react-native-purchases";
import type { ProState } from "./pro-state";

/** Only established inactive rights and a settled safe operation permit purchase encouragement. */
export function canPurchasePro(state: ProState): boolean {
  return (
    state.status === "inactive" &&
    ["idle", "cancelled", "failed", "completed", "restored"].includes(
      state.operation,
    )
  );
}

/** Reads only the explicit deployment offering; absence and transport failure remain distinct. */
export async function loadProOffering(
  offeringId: string,
): Promise<PurchasesOffering | null> {
  if (!offeringId) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[offeringId];
    return offering?.availablePackages.length ? offering : null;
  } catch {
    Sentry.captureException(new Error("Pro offering unavailable"), {
      tags: { feature: "pro", operation: "offering", outcome: "failed" },
    });
    throw new Error("Pro offering unavailable");
  }
}
