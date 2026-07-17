import { useQuery } from '@tanstack/react-query';
import { TeamSearchDocDTO } from '@/src/types/Team';
import { EnumFormat } from '@/src/types/enums/Format';
import { EnumGender } from '@/src/types/enums/Gender';
import { searchMobileTeams } from '@/src/api/generated/mobile-gateway/endpoints/mobile-search/mobile-search';
import {
  SearchMobileTeamsQueryParams,
  SearchMobileTeamsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-search/mobile-search.zod';
import { toTeamSearchView } from './searchView';

export const useSearchTeams = (
  query: string,
  season?: string,
  divisionId?: number,
  format?: EnumFormat,
  gender?: EnumGender,
) => {
  return useQuery<TeamSearchDocDTO[]>({
    queryKey: ['teams', 'search', query, season, divisionId, format, gender],
    queryFn: async ({ signal }) => {
      const params = SearchMobileTeamsQueryParams.parse({
        query,
        season,
        divisionId,
        format,
        gender,
      });
      const response = SearchMobileTeamsResponse.parse(
        await searchMobileTeams(params, undefined, signal),
      );
      return response.items.map(toTeamSearchView);
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
