// src/utils/useEntityById.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useEntityById = <T>(
    key: string,
    fetchOneFn: (id: number) => Promise<T | null>,
    id?: number
) => {
    const qc = useQueryClient();

    return useQuery<T | null, Error>({
        queryKey: [key, id],
        queryFn: () => fetchOneFn(id as number),
        enabled: !!id,
        staleTime: 0,
        initialData: () => {
            if (id == null) return undefined;
            return qc.getQueryData<T>([key, id]);
        },
    });
};