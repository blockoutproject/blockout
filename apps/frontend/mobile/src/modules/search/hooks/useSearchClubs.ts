import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/ApiProvider";
import type { ClubSearchResponse } from "@/src/modules/search/model/Search";

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
