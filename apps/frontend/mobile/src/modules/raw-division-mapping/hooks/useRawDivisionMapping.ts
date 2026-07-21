import {useQuery} from "@tanstack/react-query";
import {RawDivisionMappingResponse} from "@/src/modules/raw-division-mapping/model/RawDivisionMapping";
import {useApis} from "@/src/shared/providers/ApiProvider";

export const useRawDivisionMappings = (
  leagueCode?: string,
  season?: string,
) => {
  const {mobile} = useApis();

  return useQuery<RawDivisionMappingResponse[]>({
    queryKey: ["raw-division-mappings", leagueCode, season],
    queryFn: () => mobile.config.getRawDivisionMappings(leagueCode, season),
    staleTime: 1000 * 60,
  });
};
