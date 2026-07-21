import {useQuery, useQueryClient} from "@tanstack/react-query";

export const useEntityById = <T>(
  key: string,
  fetchOneFn: (id: any) => Promise<T | null>,
  id?: any,
  enabled = true
) => {
  const qc = useQueryClient();
  const isEnabled = enabled && !!id;

  return useQuery<T | null, Error>({
    queryKey: [key, id],
    queryFn: () => fetchOneFn(id),
    enabled: isEnabled,
    staleTime: 0,
    initialData: () => {
      if (id == null) return undefined;
      return qc.getQueryData<T>([key, id]);
    },
    retry: false
  });
};
