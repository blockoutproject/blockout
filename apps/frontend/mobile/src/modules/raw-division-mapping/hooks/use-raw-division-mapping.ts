import { useQuery } from "@tanstack/react-query";
import { RawDivisionMappingResponse } from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/api-provider";

export const useRawDivisionMappings = (
  leagueCode?: string,
  season?: string,
) => {
  const { mobile } = useApis();

  return useQuery<RawDivisionMappingResponse[]>({
    queryKey: ["raw-division-mappings", leagueCode, season],
    queryFn: () =>
      mobile.rawDivisionMappings.getRawDivisionMappings(leagueCode, season),
    staleTime: 1000 * 60,
  });
};
