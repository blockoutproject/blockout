import { useFollowState } from "@/src/shared/hooks/useFollowState";
import type { PoolResponse } from "@/src/modules/pool/model/Pool";
import { EntityType } from "@/src/types/User";

export function usePoolFollowState(pool: PoolResponse) {
  return useFollowState("enrichedPools", EntityType.POOL, pool);
}
