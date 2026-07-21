import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
import {EnrichedTeamDTO} from "@/src/types/Team";

export const useEnrichedTeamById = (id?: number, enabled?: boolean) => {
  const {mobile} = useApis();

  return useEntityById<EnrichedTeamDTO>(
    "enrichedTeams",
    (teamId: number) => mobile.teams.getEnrichedTeamById(teamId),
    id,
    enabled
  );
};
