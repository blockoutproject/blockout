import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import { PoolSummaryDTO } from "@/src/types/Pool";

/**
 * Hook pour récupérer les équipes suivies par l'utilisateur.
 */
export const useFollowedPoolList = (followedPoolIds?: number[]) => {
    const idsKey = useMemo(
        () =>
            followedPoolIds?.length
                ? [...followedPoolIds].sort((a, b) => a - b).join(",")
                : "none",
        [followedPoolIds]
    );

    const queryKey = useMemo(
        () => ["followed-pools", `ids:${idsKey}`],
        [idsKey]
    );

    const query = useQuery({
        queryKey,
        enabled: Boolean(followedPoolIds && followedPoolIds.length > 0),
        queryFn: async () => {
            if (!followedPoolIds?.length) return [];

            const api = MobileGatewayApi.getInstance();
            const pools = await api.getPoolListByIds(followedPoolIds);
            return pools ?? [];
        },
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const pools: PoolSummaryDTO[] = query.data ?? [];
    const hasLoadedOnce = query.isSuccess || query.isError;
    const isBackgroundRefetching =
        query.isFetching && !query.isLoading;

    return {
        ...query,
        pools,
        hasLoadedOnce,
        isBackgroundRefetching,
    };
};