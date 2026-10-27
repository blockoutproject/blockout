import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import type { ListTeamsParams } from "../../../../.generated/schemas/index.zod";
import { useAccountSession } from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import type { DiscoveryResource } from "./discovery-context";
import { createDiscoveryQueryOptions } from "./discovery-queries";

/**
 * Subscribes only the visible public text scene through the existing F05/F12 and F13 owners.
 * Native neighbour mounting starts no read; tab return keeps Query's no-refetch/no-retry-on-mount rules.
 */
export function useDiscoveryQuery(
  resource: DiscoveryResource,
  input: Omit<ListTeamsParams, "cursor" | "exampleIds">,
  active = true,
) {
  const session = useAccountSession();
  const admission = useOrdinaryRequest();
  const { getCredentials } = useAuth0();
  const options = createDiscoveryQueryOptions(
    resource,
    input,
    session,
    admission,
    getCredentials,
  );
  return useInfiniteQuery({ ...options, subscribed: active });
}
