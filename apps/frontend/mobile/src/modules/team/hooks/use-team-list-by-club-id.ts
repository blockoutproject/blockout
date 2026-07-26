import { useApis } from "@/src/shared/providers/api-provider";
import { useEntityById } from "@/src/shared/hooks/use-entity-by-id";
import type { TeamSummaryResponse } from "@/src/shared/generated/models";

export const useTeamListByClubId = (id?: string, enabled?: boolean) => {
  const { mobile } = useApis();

  return useEntityById<TeamSummaryResponse[], string>(
    "teamList",
    (clubId: string) => mobile.teams.getTeamsByClubId(clubId),
    id,
    enabled,
  );
};
