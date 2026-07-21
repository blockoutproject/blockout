import { useApis } from "@/src/shared/providers/ApiProvider";
import { useEntityById } from "@/src/shared/hooks/useEntityById";
import type { PoolResponse } from "@/src/modules/pool/model/Pool";

export const usePoolById = (id?: number, enabled?: boolean) => {
  const { mobile } = useApis();

  return useEntityById<PoolResponse, number>(
    "enrichedPools",
    (poolId: number) => mobile.pools.getPoolById(poolId),
    id,
    enabled,
  );
};
