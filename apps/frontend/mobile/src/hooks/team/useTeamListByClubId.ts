import {useApis} from "@/src/context/ApiProvider";
import {useEntityById} from "../utils/useEntityById";
import {TeamSummaryDTO} from "@/src/types/Team";

export const useTeamListByClubId = (id?: string, enabled?: boolean) => {
  const {mobile} = useApis();

  return useEntityById<TeamSummaryDTO[]>(
    "teamList",
    (clubId: string) => mobile.teams.getTeamListByClubId(clubId),
    id,
    enabled
  );
};
