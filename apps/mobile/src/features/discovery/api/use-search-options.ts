import { useQuery } from "@tanstack/react-query";
import type { SearchResourceTypeEnum } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { createSearchOptionsQueryOptions } from "./discovery-queries";

/** Reads public current choices through the same generated transport and session/admission owners. */
export function useSearchOptions(resource: SearchResourceTypeEnum) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = session;
  return useQuery(
    createSearchOptionsQueryOptions(
      resource,
      session,
      admission,
      getCredentials,
    ),
  );
}
