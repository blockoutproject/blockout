import { useApis } from "@/src/shared/providers/api-provider";
import { useEntityById } from "@/src/shared/hooks/use-entity-by-id";
import type { PoolResponse } from "@/src/shared/generated/models";

export const usePoolById = (id?: number, enabled?: boolean) => {
  const { mobile } = useApis();

  return useEntityById<PoolResponse, number>(
    "enrichedPools",
    (poolId: number) => mobile.pools.getPoolById(poolId),
    id,
    enabled,
  );
};
