import { useFollowState } from "@/src/shared/hooks/useFollowState";
import type { EnrichedPoolDTO } from "@/src/types/Pool";
import { EntityType } from "@/src/types/User";

export function usePoolFollowState(enrichedPool: EnrichedPoolDTO) {
  return useFollowState("enrichedPools", EntityType.POOL, enrichedPool);
}
