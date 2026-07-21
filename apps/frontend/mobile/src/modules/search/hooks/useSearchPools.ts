import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/ApiProvider";
import type { PoolSearchResponse } from "@/src/modules/search/model/Search";
import { EnumFormat } from "@/src/shared/model/enums/Format";
import { EnumGender } from "@/src/shared/model/enums/Gender";

export const useSearchPools = (
  query: string,
  season?: string,
  divisionId?: number,
  format?: EnumFormat,
  gender?: EnumGender,
) => {
  const { mobile } = useApis();

  return useQuery<PoolSearchResponse[]>({
    queryKey: ["pools", "search", query, season, divisionId, format, gender],
    queryFn: async () =>
      mobile.search.searchPools(query, season, divisionId, format, gender),
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
