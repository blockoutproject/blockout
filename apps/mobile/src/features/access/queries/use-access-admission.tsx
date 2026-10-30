import {
  createContext,
  useContext,
  useEffect,
  type PropsWithChildren,
} from "react";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { accessPresentation } from "../state/access-presentation";
import { useApplicationAccess } from "./use-application-access";

const AdmissionContext = createContext<ReturnType<typeof useAdmission> | null>(
  null,
);

/** Derives route availability from the complete public check and F05's current usable account. */
function useAdmission() {
  const access = useApplicationAccess();
  const { permissions, hasCommands, account } = useAdministrationCapabilities();
  const session = useAccountSession();
  const { bypass, clearBypass } = access;
  useEffect(() => {
    if (
      bypass &&
      (bypass.subject !== session.subject ||
        bypass.accountId !== session.accountId ||
        !permissions?.bypassMaintenance ||
        access.snapshot.maintenance?.active === false)
    )
      clearBypass();
  }, [
    bypass,
    clearBypass,
    session.subject,
    session.accountId,
    permissions?.bypassMaintenance,
    access.snapshot.maintenance?.active,
  ]);
  const { snapshot } = access;
  const { version } = accessPresentation(snapshot);
  const canBypass =
    permissions?.bypassMaintenance === true && version === "satisfied";
  const bypassing =
    canBypass &&
    bypass?.subject === session.subject &&
    bypass.accountId === session.accountId;
  const presentation = accessPresentation(snapshot, bypassing);
  const operations = version === "satisfied" && (hasCommands || canBypass);
  return {
    ...access,
    ...presentation,
    operations,
    administration: operations,
    permissions,
    canBypass:
      canBypass &&
      snapshot.complete !== undefined &&
      snapshot.maintenance?.active === true,
    /** Public checking and existing-session identification retry independently, without establishment or interactive login. */
    retry() {
      void access.retry();
      if (session.status === "authenticated") void account.refetch();
      else if (session.status === "authentication-error")
        session.retryAuthentication();
      else if (session.status === "initialization-error")
        session.retryInitialization();
    },
    /** Records personal intent only from current grants, a complete check and the satisfied minimum. */
    bypassMaintenance() {
      return access.requestBypass(
        session,
        canBypass &&
          snapshot.complete !== undefined &&
          snapshot.maintenance?.active === true,
      );
    },
  };
}

/** Connects public admission with existing F05 identity; ordinary and operational groups consume separate guards. */
export function AccessAdmissionProvider({ children }: PropsWithChildren) {
  const admission = useAdmission();
  return <AdmissionContext value={admission}>{children}</AdmissionContext>;
}

/** Returns the current root policy; route entry alone grants no domain operation. */
export function useAccessAdmission() {
  const admission = useContext(AdmissionContext);
  if (!admission)
    throw new Error("Access admission requires AccessAdmissionProvider");
  return admission;
}

/** Defaults closed for isolated route mounts; the production root supplies the current operational guard. */
export function useOperationalAdmission() {
  return useContext(AdmissionContext)?.operations ?? false;
}
