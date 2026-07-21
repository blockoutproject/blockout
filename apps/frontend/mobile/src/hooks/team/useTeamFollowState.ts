import { useFollowState } from "@/src/shared/hooks/useFollowState";
import type { EnrichedTeamDTO } from "@/src/types/Team";
import { EntityType } from "@/src/types/User";

export function useTeamFollowState(enrichedTeam: EnrichedTeamDTO) {
  return useFollowState("enrichedTeams", EntityType.TEAM, enrichedTeam);
}
