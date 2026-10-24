import { useAuth0 } from "react-native-auth0";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { createConsultationQueries } from "./consultation-queries";

/**
 * Captures the existing F05/F12 owners without waiting for account or Pro availability.
 * F12 supplies intent identity and rechecks each request after native credential retrieval.
 */
export function useConsultationQueries() {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  return createConsultationQueries(session, admission, getCredentials);
}
