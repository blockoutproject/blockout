import { useQueries } from '@tanstack/react-query';
import PoolsApi from '@/api/PoolsApi';
import { Pool } from '@/types/Pool';

export function usePoolsByIds(ids: number[]) {
    // Pour chaque ID, on lance une requête individuelle
    const poolQueries = useQueries({
        queries: ids.map(id => ({
            queryKey: ['pool', id],
            queryFn: async (): Promise<Pool> => {
                return PoolsApi.getInstance().getPoolById(id);
            },
            staleTime: 1000 * 60 * 5,
        })),
    });

    const pools: Record<number, Pool> = poolQueries.reduce((acc, query) => {
        if (query.data) {
            acc[query.data.id] = query.data;
        }
        return acc;
    }, {} as Record<number, Pool>);

    // Rassembler les poules chargées
    const isLoading = poolQueries.some(query => query.isLoading);
    const isError = poolQueries.some(query => query.isError);
    const error = poolQueries.find(query => query.error)?.error;

    return { pools, isLoading, isError, error };
}