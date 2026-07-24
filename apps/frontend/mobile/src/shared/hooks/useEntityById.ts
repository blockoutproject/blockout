import { useQuery, useQueryClient } from "@tanstack/react-query";

export const useEntityById = <T, TId extends string | number = string | number>(
  key: string,
  fetchOneFn: (id: TId) => Promise<T | null>,
  id?: TId,
  enabled = true,
) => {
  const qc = useQueryClient();
  const isEnabled = enabled && !!id;

  return useQuery<T | null, Error>({
    queryKey: [key, id],
    queryFn: () => fetchOneFn(id as TId),
    enabled: isEnabled,
    staleTime: 0,
    initialData: () => {
      if (id == null) return undefined;
      return qc.getQueryData<T>([key, id]);
    },
    retry: false,
  });
};
