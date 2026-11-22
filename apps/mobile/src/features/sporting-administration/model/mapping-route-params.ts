import { useLocalSearchParams } from "expo-router";
import { z } from "zod";
import {
  ListMappingPacksParams,
  MappingStatusEnum,
} from "../../../../.generated/schemas/index.zod";

export const mappingSearchSchema = ListMappingPacksParams.pick({
  search: true,
}).required();

const filterParams = z.object({
  status: MappingStatusEnum.optional().catch(undefined),
  sourceId: z.string().uuid().optional().catch(undefined),
  sourceLabel: z.string().optional().catch(undefined),
  seasonId: z
    .union([z.string().uuid(), z.literal("all")])
    .optional()
    .catch(undefined),
  seasonLabel: z.string().optional().catch(undefined),
});

export type MappingFilters = z.infer<typeof filterParams>;

/** An absent season uses the latest option; "all" explicitly removes the API season criterion. */
export function useMappingRouteParams() {
  const params = useLocalSearchParams();
  return {
    filters: filterParams.parse(params),
    search: mappingSearchSchema.shape.search.safeParse(params.search).data,
  };
}
