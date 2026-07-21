import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {EnrichedPoolDTO} from "@/src/types/Pool";

export const useEnrichedPoolById = (id?: number, enabled?: boolean) => {
  const {mobile} = useApis();

  return useEntityById<EnrichedPoolDTO>(
    "enrichedPools",
    (poolId: number) => mobile.pools.getEnrichedPoolById(poolId),
    id,
    enabled
  );
};
