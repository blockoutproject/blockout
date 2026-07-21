import {useApis} from "@/src/shared/providers/ApiProvider";
import {useEntityById} from "@/src/shared/hooks/useEntityById";
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
