import type { QueryClient } from "@tanstack/react-query";
import {
  getGetCollectionSeasonQueryKey,
  getListCollectionSourcesQueryKey,
  getListCollectionSeasonsQueryKey,
  getListCollectionControlsQueryKey,
} from "../../../../.generated/mobile";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Source changes invalidate their season decision and complete source projection together. */
export function invalidateSeasonPreparation(
  client: QueryClient,
  generation: string,
  seasonId: string,
) {
  void client.invalidateQueries({
    queryKey: getSessionQueryKey(
      generation,
      getGetCollectionSeasonQueryKey(seasonId),
    ),
    exact: true,
  });
  void client.invalidateQueries({
    queryKey: getSessionQueryKey(
      generation,
      getListCollectionSourcesQueryKey(seasonId),
    ),
    exact: true,
  });
}

/** Confirmed lifecycle changes refresh the navigation list without changing the accepted season response. */
export function invalidateCollectionSeasons(
  client: QueryClient,
  generation: string,
) {
  void client.invalidateQueries({
    queryKey: getSessionQueryKey(
      generation,
      getListCollectionSeasonsQueryKey(),
    ),
    exact: true,
  });
}

/** Control commands and terminal season closure share the same complete-scope list invalidation. */
export function invalidateCollectionControls(
  client: QueryClient,
  generation: string,
  seasonId?: string,
) {
  void client.invalidateQueries({
    queryKey: getSessionQueryKey(
      generation,
      getListCollectionControlsQueryKey(seasonId ? { seasonId } : undefined),
    ),
    exact: true,
  });
}
