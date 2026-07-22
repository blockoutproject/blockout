import { useFollowState } from "@/src/shared/hooks/useFollowState";
import type { TeamResponse } from "@/src/shared/generated/models";
import { EntityTypeEnum } from "@/src/shared/generated/models";

export function useTeamFollowState(team: TeamResponse) {
  return useFollowState("enrichedTeams", EntityTypeEnum.TEAM, team);
}
