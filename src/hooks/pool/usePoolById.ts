import { useQuery } from '@tanstack/react-query';
import { Pool } from '@/src/types/Pool';
import PoolsApi from '@/src/api/PoolsApi';

export function usePoolById(id?: number) {
    return useQuery<Pool, Error>({
        queryKey: ['pool', id],
        queryFn: async () => {
            if (id === undefined) {
                throw new Error("Aucun identifiant de pool n'a été fourni");
            }
            return PoolsApi.getInstance().getPoolById(id);
        },
        staleTime: 1000 * 60 * 5,
        enabled: id !== undefined,
    });
}