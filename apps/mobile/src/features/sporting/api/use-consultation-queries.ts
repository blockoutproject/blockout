import { useAccountSession } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { createConsultationQueries } from "./consultation-queries";

/** Uses the real private Query lifetime and captures credentials only for an explicit bypass request. */
export function useConsultationQueries() {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = session;
  return createConsultationQueries(session, admission, getCredentials);
}
