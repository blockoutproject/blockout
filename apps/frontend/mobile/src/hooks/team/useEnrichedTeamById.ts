import {useApis} from "@/src/context/ApiProvider";
import {useEntityById} from "../utils/useEntityById";
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
