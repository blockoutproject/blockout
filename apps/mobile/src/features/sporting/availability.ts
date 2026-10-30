import { useAccountSession } from "../accounts/current-account";
import { useOrdinaryRequest } from "../access/ordinary-request";
import { createConsultationQueries } from "./api/consultation-queries";

/** Invalidates the addressed public detail after a known missing follow target; no projection graph is edited. */
export function useSportingTargetAvailability() {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  return createConsultationQueries(session, admission, session.getCredentials)
    .rejectTarget;
}
