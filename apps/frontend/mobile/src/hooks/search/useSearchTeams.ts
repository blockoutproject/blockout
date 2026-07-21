import {useQuery} from "@tanstack/react-query";
import {useApis} from "@/src/context/ApiProvider";
import {TeamSearchDocDTO} from "@/src/types/Team";
import {EnumFormat} from "@/src/types/enums/Format";
import {EnumGender} from "@/src/types/enums/Gender";

export const useSearchTeams = (
  query: string,
  season?: string,
  divisionId?: number,
  format?: EnumFormat,
  gender?: EnumGender,
) => {
  const {mobile} = useApis();

  return useQuery<TeamSearchDocDTO[]>({
    queryKey: [
      "teams",
      "search",
      query,
      season,
      divisionId,
      format,
      gender,
    ],
    queryFn: async () =>
      mobile.search.searchTeams(query, season, divisionId, format, gender),
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
