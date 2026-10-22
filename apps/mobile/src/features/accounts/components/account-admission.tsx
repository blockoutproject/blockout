import { createContext, useContext, type PropsWithChildren } from "react";

const AdmissionContext = createContext(false);

/** F12 supplies ordinary admission; this boundary owns no policy, grant, cache or bypass state. */
export interface AccountAdmissionProviderProps extends PropsWithChildren {
  admitted: boolean;
}

/** Injects current F12 admission into account routes; absent composition remains unavailable. */
export function AccountAdmissionProvider({
  admitted,
  children,
}: AccountAdmissionProviderProps) {
  return <AdmissionContext value={admitted}>{children}</AdmissionContext>;
}

/** Reads ordinary navigation admission; current-account identification never derives access from it. */
export function useAccountAdmission() {
  return useContext(AdmissionContext);
}
