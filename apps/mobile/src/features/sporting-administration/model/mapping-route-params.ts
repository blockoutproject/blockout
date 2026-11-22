import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import {
  ListMappingPacksParams,
  type MappingFilterOptionResponse,
  SearchQueryText,
} from "../../../../.generated/schemas/index.zod";

const filterParams = z.object({
  status: ListMappingPacksParams.shape.status.catch(undefined),
  sourceId: ListMappingPacksParams.shape.sourceId.catch(undefined),
  sourceLabel: z.string().optional().catch(undefined),
  seasonId: z
    .union([ListMappingPacksParams.shape.seasonId.unwrap(), z.literal("all")])
    .optional()
    .catch(undefined),
  seasonLabel: z.string().optional().catch(undefined),
});

export type MappingFilters = z.infer<typeof filterParams>;

export const allMappingSeasons = "Toutes les saisons";

/** The route's explicit all-season value stays distinct from the catalogue default. */
export function selectedMappingSeason(
  { seasonId, seasonLabel }: MappingFilters,
  latest?: MappingFilterOptionResponse,
) {
  if (seasonId === "all") {
    return { id: seasonId, label: allMappingSeasons };
  }
  if (seasonId) {
    return { id: seasonId, label: seasonLabel ?? "Saison sélectionnée" };
  }
  return latest;
}

/** An absent season uses the latest option; "all" explicitly removes the API season criterion. */
export function useMappingRouteParams() {
  const params = useLocalSearchParams();
  return {
    filters: filterParams.parse(params),
    search: SearchQueryText.safeParse(params.search).data,
  };
}
