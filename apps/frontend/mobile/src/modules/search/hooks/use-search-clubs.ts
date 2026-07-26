import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/api-provider";
import type { ClubSearchResponse } from "@/src/shared/generated/models";

export const useSearchClubs = (query: string, triggerOnEmpty = false) => {
  const { mobile } = useApis();

  return useQuery<ClubSearchResponse[]>({
    queryKey: ["clubs", "search", query],
    queryFn: async () => mobile.search.searchClubs(query),
    enabled: triggerOnEmpty || query.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
