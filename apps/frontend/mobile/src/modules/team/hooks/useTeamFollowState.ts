import { useFollowState } from "@/src/shared/hooks/useFollowState";
import type { TeamResponse } from "@/src/modules/team/model/Team";
import { EntityType } from "@/src/types/User";

export function useTeamFollowState(team: TeamResponse) {
  return useFollowState("enrichedTeams", EntityType.TEAM, team);
}
