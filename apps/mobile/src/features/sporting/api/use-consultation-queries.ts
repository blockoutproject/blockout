import { useMemo } from "react";
import { randomUUID } from "expo-crypto";
import { useAuth0 } from "react-native-auth0";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { createConsultationQueries } from "./consultation-queries";

/**
 * Captures the existing F05/F12 owners without waiting for account or Pro availability. One local
 * key token follows the exact F12 intent, including clear/re-enable within the same session. It
 * stores no authorization state; F12 still rechecks each request after native credential retrieval.
 */
export function useConsultationQueries() {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const intent = admission.bypass;
  const bypassContextId = useMemo(
    () => (intent ? randomUUID() : undefined),
    [intent],
  );
  return createConsultationQueries(
    session,
    admission,
    getCredentials,
    bypassContextId,
  );
}
