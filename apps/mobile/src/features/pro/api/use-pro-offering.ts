import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAccountSession } from "../../accounts/current-account";
import { createProOfferingQueryOptions } from "./pro-offering-queries";

/** A newly entered, purchase-eligible destination reads its session-scoped offer; retries remain explicit. */
export function useProOffering(enabled: boolean) {
  const account = useAccountSession();
  const session = account.getSnapshot();
  const configured: unknown =
    Constants.expoConfig?.extra?.revenueCat?.offeringIdentifier;
  const offeringId = typeof configured === "string" ? configured : "";
  return useQuery({
    ...createProOfferingQueryOptions(
      { ...session, isCurrent: account.isCurrent },
      offeringId,
    ),
    enabled,
    refetchOnMount: "always",
    retryOnMount: true,
  });
}
