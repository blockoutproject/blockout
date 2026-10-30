import { useAuth0 } from "react-native-auth0";
import { useAccountSession } from "../accounts/current-account";
import { useOrdinaryRequest } from "../access/ordinary-request";
import { createConsultationQueries } from "./api/consultation-queries";
import type { QueryFunctionContext } from "@tanstack/react-query";
import type { ApiError } from "../../shared/api/api-fetch";

/**
 * Applies public target absence through the existing sporting cleanup. The account may become
 * established during a public read without changing generation: capture that current snapshot
 * only while the original generation remains current. No private lookup or refusal store is added.
 */
export function useSportingTargetAvailability() {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  /** Resolves only an already established current owner before invoking the ordinary F03 boundary. */
  return function rejectTarget(
    context: QueryFunctionContext,
    type: "team" | "pool",
    id: string,
    error: ApiError,
  ) {
    if (!session.isCurrent(session.generation)) return Promise.resolve();
    const current = { ...session.getSnapshot(), isCurrent: session.isCurrent };
    return createConsultationQueries(
      current,
      admission,
      getCredentials,
    ).rejectTarget(context, type, id, error);
  };
}
