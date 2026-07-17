import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TeamSummaryDTO } from '@/src/types/Team';
import { listMobileTeamsByIds } from '@/src/api/generated/mobile-gateway/endpoints/mobile-teams/mobile-teams';
import {
  ListMobileTeamsByIdsQueryParams,
  ListMobileTeamsByIdsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-teams/mobile-teams.zod';
import { toTeamSummaryView } from './teamView';

/**
 * Hook pour récupérer les équipes suivies par l'utilisateur.
 */
export const useFollowedTeamList = (followedTeamIds?: number[]) => {
  const idsKey = useMemo(
    () =>
      followedTeamIds?.length
        ? [...followedTeamIds].sort((a, b) => a - b).join(',')
        : 'none',
    [followedTeamIds],
  );

  const queryKey = useMemo(() => ['followed-teams', `ids:${idsKey}`], [idsKey]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(followedTeamIds && followedTeamIds.length > 0),
    queryFn: async ({ signal }) => {
      if (!followedTeamIds?.length) return [];

      const params = ListMobileTeamsByIdsQueryParams.parse({
        ids: followedTeamIds,
      });
      const response = await listMobileTeamsByIds(params, undefined, signal);
      return ListMobileTeamsByIdsResponse.parse(response).items.map(
        toTeamSummaryView,
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const teams: TeamSummaryDTO[] = query.data ?? [];
  const hasLoadedOnce = query.isSuccess || query.isError;
  const isBackgroundRefetching = query.isFetching && !query.isLoading;

  return {
    ...query,
    teams,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
