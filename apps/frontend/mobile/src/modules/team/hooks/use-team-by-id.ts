import { useApis } from "@/src/shared/providers/api-provider";
import { useEntityById } from "@/src/shared/hooks/use-entity-by-id";
import type { TeamResponse } from "@/src/shared/generated/models";

export const useTeamById = (id?: number, enabled?: boolean) => {
  const { mobile } = useApis();

  return useEntityById<TeamResponse, number>(
    "enrichedTeams",
    (teamId: number) => mobile.teams.getTeamById(teamId),
    id,
    enabled,
  );
};
