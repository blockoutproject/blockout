import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAccountSession } from "../../accounts/current-account";
import { createProOfferingQueryOptions } from "./pro-offering-queries";

/** Observes the session-scoped offer. The entry owner explicitly refetches after checking purchase eligibility. */
export function useProOffering() {
  const account = useAccountSession();
  const session = account.getSnapshot();
  const configured: unknown =
    Constants.expoConfig?.extra?.revenueCat?.offeringIdentifier;
  const offeringId = typeof configured === "string" ? configured : "";
  return useQuery(
    createProOfferingQueryOptions(
      { ...session, isCurrent: account.isCurrent },
      offeringId,
    ),
  );
}
