import type { QueryClient } from "@tanstack/react-query";
import {
  getListCollectionSeasonsQueryKey,
  getListCollectionControlsQueryKey,
} from "../../../../.generated/mobile";

/** Confirmed lifecycle changes refresh the navigation list without changing the accepted season response. */
export function invalidateCollectionSeasons(client: QueryClient) {
  void client.invalidateQueries({
    queryKey: getListCollectionSeasonsQueryKey(),
    exact: true,
  });
}

/** Closure refreshes controls for exactly the affected season. */
export function invalidateCollectionControls(
  client: QueryClient,
  seasonId: string,
) {
  void client.invalidateQueries({
    queryKey: getListCollectionControlsQueryKey({ seasonId }),
    exact: true,
  });
}
