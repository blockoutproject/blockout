import {useMemo} from "react";
import {useQuery} from "@tanstack/react-query";
import {TeamSummaryDTO} from "@/src/types/Team";
import {useApis} from "@/src/context/ApiProvider";

/**
 * Hook pour récupérer les équipes suivies par l'utilisateur.
 */
export const useFollowedTeamList = (followedTeamIds?: number[]) => {
  const {mobile} = useApis();
  const idsKey = useMemo(
    () =>
      followedTeamIds?.length
        ? [...followedTeamIds].sort((a, b) => a - b).join(",")
        : "none",
    [followedTeamIds]
  );

  const queryKey = useMemo(
    () => ["followed-teams", `ids:${idsKey}`],
    [idsKey]
  );

  const query = useQuery({
    queryKey,
    enabled: Boolean(followedTeamIds && followedTeamIds.length > 0),
    queryFn: async () => {
      if (!followedTeamIds?.length) return [];

      const teams = await mobile.teams.getTeamListByIds(followedTeamIds);
      return teams ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const teams: TeamSummaryDTO[] = query.data ?? [];
  const hasLoadedOnce = query.isSuccess || query.isError;
  const isBackgroundRefetching =
    query.isFetching && !query.isLoading;

  return {
    ...query,
    teams,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
