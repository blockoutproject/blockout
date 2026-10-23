import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAccountSession } from "../accounts/current-account";
import { canPurchasePro, loadProOffering } from "./pro-offering";
import { usePro } from "./pro-provider";
import { getSessionQueryKey } from "../../shared/query/query-client";

/** Session-scoped offering request; only an explicit provider entry enables it, never a guest or uncertain purchase. */
export function useProOffering(requested: boolean) {
  const account = useAccountSession();
  const { state } = usePro();
  const session = account.getSnapshot();
  const configured: unknown =
    Constants.expoConfig?.extra?.revenueCat?.offeringIdentifier;
  const offeringId = typeof configured === "string" ? configured : "";
  return useQuery({
    queryKey: getSessionQueryKey(session.generation, [
      "pro-offering",
      session.accountId,
      offeringId,
    ]),
    queryFn: () => loadProOffering(offeringId),
    enabled: requested && canPurchasePro(state),
    retry: false,
    refetchOnMount: "always",
  });
}
