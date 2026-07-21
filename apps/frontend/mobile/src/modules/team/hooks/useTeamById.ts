import { useApis } from "@/src/shared/providers/ApiProvider";
import { useEntityById } from "@/src/shared/hooks/useEntityById";
import type { TeamResponse } from "@/src/modules/team/model/Team";

export const useTeamById = (id?: number, enabled?: boolean) => {
  const { mobile } = useApis();

  return useEntityById<TeamResponse>(
    "enrichedTeams",
    (teamId: number) => mobile.teams.getTeamById(teamId),
    id,
    enabled,
  );
};
