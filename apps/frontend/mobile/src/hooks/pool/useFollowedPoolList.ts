import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PoolSummaryDTO } from '@/src/types/Pool';
import { listMobilePoolsByIds } from '@/src/api/generated/mobile-gateway/endpoints/mobile-pools/mobile-pools';
import {
  ListMobilePoolsByIdsQueryParams,
  ListMobilePoolsByIdsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-pools/mobile-pools.zod';
import { toPoolSummaryView } from './poolView';

/**
 * Hook pour récupérer les équipes suivies par l'utilisateur.
 */
export const useFollowedPoolList = (followedPoolIds?: number[]) => {
  const idsKey = useMemo(
    () =>
      followedPoolIds?.length
        ? [...followedPoolIds].sort((a, b) => a - b).join(',')
        : 'none',
    [followedPoolIds],
  );

  const queryKey = useMemo(() => ['followed-pools', `ids:${idsKey}`], [idsKey]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(followedPoolIds && followedPoolIds.length > 0),
    queryFn: async ({ signal }) => {
      if (!followedPoolIds?.length) return [];

      const params = ListMobilePoolsByIdsQueryParams.parse({
        ids: followedPoolIds,
      });
      const response = await listMobilePoolsByIds(params, undefined, signal);
      return ListMobilePoolsByIdsResponse.parse(response).items.map(
        toPoolSummaryView,
      );
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pools: PoolSummaryDTO[] = query.data ?? [];
  const hasLoadedOnce = query.isSuccess || query.isError;
  const isBackgroundRefetching = query.isFetching && !query.isLoading;

  return {
    ...query,
    pools,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
