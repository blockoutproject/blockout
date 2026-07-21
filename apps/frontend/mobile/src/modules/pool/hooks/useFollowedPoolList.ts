import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PoolSummaryResponse } from "@/src/modules/pool/model/Pool";
import { useApis } from "@/src/shared/providers/ApiProvider";

/**
 * Hook pour récupérer les équipes suivies par l'utilisateur.
 */
export const useFollowedPoolList = (followedPoolIds?: number[]) => {
  const { mobile } = useApis();

  const idsKey = useMemo(
    () =>
      followedPoolIds?.length
        ? [...followedPoolIds].sort((a, b) => a - b).join(",")
        : "none",
    [followedPoolIds],
  );

  const queryKey = useMemo(() => ["followed-pools", `ids:${idsKey}`], [idsKey]);

  const query = useQuery({
    queryKey,
    enabled: Boolean(followedPoolIds && followedPoolIds.length > 0),
    queryFn: async () => {
      if (!followedPoolIds?.length) return [];

      const pools = await mobile.pools.getPoolsByIds(followedPoolIds);
      return pools ?? [];
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const pools: PoolSummaryResponse[] = query.data ?? [];
  const hasLoadedOnce = query.isSuccess || query.isError;
  const isBackgroundRefetching = query.isFetching && !query.isLoading;

  return {
    ...query,
    pools,
    hasLoadedOnce,
    isBackgroundRefetching,
  };
};
