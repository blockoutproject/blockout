import { useQuery } from "@tanstack/react-query";
import { useApis } from "@/src/shared/providers/api-provider";
import type { TeamSearchResponse } from "@/src/shared/generated/models";
import { FormatEnum } from "@/src/shared/view-models/format-labels";
import { GenderEnum } from "@/src/shared/view-models/gender-labels";

export const useSearchTeams = (
  query: string,
  season?: string,
  divisionId?: number,
  format?: FormatEnum,
  gender?: GenderEnum,
) => {
  const { mobile } = useApis();

  return useQuery<TeamSearchResponse[]>({
    queryKey: ["teams", "search", query, season, divisionId, format, gender],
    queryFn: async () =>
      mobile.search.searchTeams(query, season, divisionId, format, gender),
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
