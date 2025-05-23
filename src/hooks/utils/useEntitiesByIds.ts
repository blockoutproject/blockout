import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

export const useEntitiesByIds = <T extends { id: number }>(
    key: string,
    fetchFn: (ids: number[]) => Promise<T[]>,
    ids?: number[]
) => {
    const qc = useQueryClient();

    const query = useQuery<T[], Error>({
        queryKey: [key, ids],
        queryFn: () => fetchFn(ids ?? []),
        enabled: (ids?.length ?? 0) > 0,
        staleTime: 0,
    });

    useEffect(() => {
        if (query.data) {
            query.data.forEach(item => {
                qc.setQueryData([key, item.id], item);
            });
        }
    }, [query.data, key, qc]);

    const entitiesMap: Record<number, T> = useMemo(() => {
        const map: Record<number, T> = {};
        (query.data ?? []).forEach(e => {
            map[e.id] = e;
        });
        return map;
    }, [query.data]);

    return { entitiesMap, ...query };
};