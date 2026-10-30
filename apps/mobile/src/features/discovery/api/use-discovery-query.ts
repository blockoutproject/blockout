import { useId, useState } from "react";
import { hashKey, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import {
  createDiscoveryContext,
  type DiscoveryResource,
} from "./discovery-context";
import {
  createSearchExamplesQueryOptions,
  createDiscoveryQueryOptions,
} from "./discovery-queries";

/** Observes the visible text context through native Query; stale benign cards wait for their own refresh. */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  active = true,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const options = createDiscoveryQueryOptions(
    resource,
    input,
    session,
    admission,
    session.getCredentials,
  );
  return useInfiniteQuery({ ...options, subscribed: active });
}

/** Each filter visit has one native page; its accepted UUIDs supply subsequent refresh selection. */
export function useSearchExamplesQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  active: boolean,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const visit = useId();
  const context = hashKey(createDiscoveryContext(resource, input).queryKey);
  const [selection, setSelection] = useState<{
    context: string;
    revision: number;
  }>({ context, revision: 0 });
  if (selection.context !== context)
    setSelection({ context, revision: selection.revision + 1 });
  const options = createSearchExamplesQueryOptions(
    resource,
    input,
    `${visit}:${selection.revision}`,
    session,
    admission,
    session.getCredentials,
  );
  const query = useQuery({ ...options, enabled: active, subscribed: active });
  return query;
}
