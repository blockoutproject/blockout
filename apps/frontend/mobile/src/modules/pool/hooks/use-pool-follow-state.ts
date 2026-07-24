import { useFollowState } from "@/src/shared/hooks/use-follow-state";
import type { PoolResponse } from "@/src/shared/generated/models";
import { EntityTypeEnum } from "@/src/shared/generated/models";

export function usePoolFollowState(pool: PoolResponse) {
  return useFollowState("enrichedPools", EntityTypeEnum.POOL, pool);
}
