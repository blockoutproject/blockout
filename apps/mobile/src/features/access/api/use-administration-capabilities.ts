import { useAccountAvailability } from "@/features/accounts/current-account";
import { canReadDivisions } from "../division-catalog-access";

/**
 * Derives presentation from F05's current generated account, never from credentials or a second cache.
 * Matching grants survive technical reread failure; actual account refusal still withdraws them.
 */
export function useAdministrationCapabilities() {
  const { session, account, usable } = useAccountAvailability();
  const permissions = usable ? account.data?.permissions : undefined;
  const hasCommands =
    permissions?.manageMaintenance === true ||
    permissions?.manageApplicationVersions === true ||
    permissions?.manageCollection === true ||
    canReadDivisions(permissions);
  return { permissions, hasCommands, account, sessionStatus: session.status };
}
