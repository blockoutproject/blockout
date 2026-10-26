import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import type { DiscoveryResource } from "./discovery-context";
import { createDiscoveryQueryOptions } from "./discovery-queries";

/** Observes only the current public text selection through the existing F05/F12 and F13 owners. */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const client = useQueryClient();
  const options = createDiscoveryQueryOptions(
    resource,
    input,
    session,
    admission,
    getCredentials,
  );
  const query = useInfiniteQuery(options);

  /** Cancels old pagination and replaces the traversal only after success; returns the original failure for event feedback. */
  async function refresh() {
    if (!options.enabled || !session.isCurrent(session.generation)) return;
    await client.cancelQueries({ queryKey: options.queryKey, exact: true });
    if (!session.isCurrent(session.generation)) return;
    try {
      await client.infiniteQuery({ ...options, pages: 1, staleTime: 0 });
    } catch (error) {
      // The observer retains authorized pages; the originating gesture may announce its failure.
      return error;
    }
  }

  return { ...query, refresh };
}
