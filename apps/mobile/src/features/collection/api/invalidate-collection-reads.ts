import type { QueryClient } from "@tanstack/react-query";
import {
  getGetCollectionSeasonQueryKey,
  getListCollectionSourcesQueryKey,
  getListCollectionSeasonsQueryKey,
  getListCollectionControlsQueryKey,
} from "../../../../.generated/mobile";

/** Source changes invalidate their season decision and complete source projection together. */
export function invalidateSeasonPreparation(
  client: QueryClient,
  seasonId: string,
) {
  void client.invalidateQueries({
    queryKey: getGetCollectionSeasonQueryKey(seasonId),
    exact: true,
  });
  void client.invalidateQueries({
    queryKey: getListCollectionSourcesQueryKey(seasonId),
    exact: true,
  });
}
/** Confirmed lifecycle changes refresh the navigation list without changing the accepted season response. */
export function invalidateCollectionSeasons(client: QueryClient) {
  void client.invalidateQueries({
    queryKey: getListCollectionSeasonsQueryKey(),
    exact: true,
  });
}
/** Control commands and terminal season closure share the same complete-scope list invalidation. */
export function invalidateCollectionControls(
  client: QueryClient,
  seasonId?: string,
) {
  void client.invalidateQueries({
    queryKey: getListCollectionControlsQueryKey(
      seasonId ? { seasonId } : undefined,
    ),
    exact: true,
  });
}
