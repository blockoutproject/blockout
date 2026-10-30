import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { canReadDivisions } from "../division-catalog-access";
/**
 * Derives presentation from F05's current generated account, never from credentials or a second cache.
 * A failed read hides retained grants; lifecycle isolation remains with F05's identity-owned cache lifetime.
 */
export function useAdministrationCapabilities() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const permissions =
    session.status === "authenticated" &&
    session.accountId === account.data?.accountId &&
    !account.isError
      ? account.data?.permissions
      : undefined;
  const hasCommands =
    permissions?.manageMaintenance === true ||
    permissions?.manageApplicationVersions === true ||
    permissions?.manageCollection === true ||
    canReadDivisions(permissions);
  return { permissions, hasCommands, account, sessionStatus: session.status };
}
