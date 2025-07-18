import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useEntityById = <T>(
    key: string,
    fetchOneFn: (id: any) => Promise<T | null>,
    id?: any
) => {
    const qc = useQueryClient();

    return useQuery<T | null, Error>({
        queryKey: [key, id],
        queryFn: () => fetchOneFn(id),
        enabled: !!id,
        staleTime: 0,
        initialData: () => {
            if (id == null) return undefined;
            return qc.getQueryData<T>([key, id]);
        },
    });
};