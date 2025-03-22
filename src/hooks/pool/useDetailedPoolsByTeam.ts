import { Pool } from "@/src/types/Pool";
import { useQuery } from "@tanstack/react-query";
import { usePoolsAssocByTeam } from "./usePoolsAssocByTeam";
import PoolsApi from "@/src/api/PoolsApi";

export function useDetailedPoolsByTeam(teamId: number) {
    const {
        data: poolsAssoc,
        isLoading: isPoolsAssocLoading,
        isSuccess: isPoolsAssocSuccess,
        isError: isPoolsAssocError,
    } = usePoolsAssocByTeam(teamId);

    const detailedPoolsQuery = useQuery<Pool[], Error>({
        queryKey: ['poolsByTeam', teamId],
        queryFn: async () => {
            if (!poolsAssoc) return [];

            return Promise.all(
                poolsAssoc.map(async ({ pool_id }) => {
                    const pool = await PoolsApi.getInstance().getPoolById(pool_id);
                    return { ...pool };
                })
            );
        },
        staleTime: 1000 * 60 * 5,
        enabled: !!poolsAssoc && poolsAssoc.length > 0,
    });

    return {
        data: detailedPoolsQuery.data,
        isLoading: isPoolsAssocLoading || detailedPoolsQuery.isLoading,
        isSuccess: isPoolsAssocSuccess && detailedPoolsQuery.isSuccess && detailedPoolsQuery.data !== undefined,
        isError: isPoolsAssocError || detailedPoolsQuery.isError,
    };
}