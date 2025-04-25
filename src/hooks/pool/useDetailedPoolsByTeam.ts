import { useMemo } from "react";
import { usePoolsAssocByTeam } from "./usePoolsAssocByTeam";
import { usePoolsByIds } from "./usePoolsByIds";
import type { Pool } from "@/src/types/Pool";

export const useDetailedPoolsByTeam = (teamId: number) => {
    const {
        data: poolsAssoc,
        isLoading: isPoolsAssocLoading,
        isSuccess: isPoolsAssocSuccess,
        isError: isPoolsAssocError,
    } = usePoolsAssocByTeam(teamId);

    const poolIds = poolsAssoc?.map(({ pool_id }) => pool_id) ?? [];

    const {
        entitiesMap: poolsMap,
        isLoading: isPoolsLoading,
        isError: isPoolsError,
    } = usePoolsByIds(poolIds);

    const pools = useMemo<Pool[]>(() => {
        if (!poolsAssoc) return [];
        return poolsAssoc
            .map(({ pool_id }) => poolsMap[pool_id])
            .filter((p): p is Pool => p !== undefined);
    }, [poolsAssoc, poolsMap]);

    return {
        pools,
        isLoading: isPoolsAssocLoading || isPoolsLoading,
        isError: isPoolsAssocError || isPoolsError,
        isSuccess: isPoolsAssocSuccess && !isPoolsLoading && !isPoolsError,
    };
}