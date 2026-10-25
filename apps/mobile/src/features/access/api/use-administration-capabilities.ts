import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";

/**
 * Derives presentation from F05's current generated account, never from credentials or a second cache.
 * A failed read hides retained grants; lifecycle isolation remains with F05/F13's single generation.
 */
export function useAdministrationCapabilities() {
  const session = useAccountSession();
  const account = useCurrentAccount();
  const permissions =
    session.status === "authenticated" &&
    session.isCurrent(session.generation) &&
    session.accountId === account.data?.accountId &&
    !account.isError
      ? account.data?.permissions
      : undefined;
  const hasCommands =
    permissions?.manageMaintenance === true ||
    permissions?.manageApplicationVersions === true ||
    permissions?.manageCollection === true ||
    permissions?.manageSportingClassification === true ||
    permissions?.manageSportingPresentation === true ||
    permissions?.manageDivisionLifecycle === true;
  return { permissions, hasCommands, account, sessionStatus: session.status };
}
