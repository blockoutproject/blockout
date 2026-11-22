import type { QueryClient } from "@tanstack/react-query";
import {
  getListCollectionSeasonsQueryKey,
  getGetCollectionSeasonQueryKey,
} from "../../../../.generated/mobile";

/** Revalidates the selected season and its navigation entry after a confirmed lifecycle change. */
export function invalidateCollectionSeason(
  client: QueryClient,
  seasonId: string,
) {
  void client.invalidateQueries({
    queryKey: getGetCollectionSeasonQueryKey(seasonId),
    exact: true,
  });
  void client.invalidateQueries({
    queryKey: getListCollectionSeasonsQueryKey(),
    exact: true,
  });
}
