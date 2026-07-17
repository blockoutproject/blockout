import { useQuery } from '@tanstack/react-query';
import { ClubSearchDocDTO } from '@/src/types/Club';
import { searchMobileClubs } from '@/src/api/generated/mobile-gateway/endpoints/mobile-search/mobile-search';
import {
  SearchMobileClubsQueryParams,
  SearchMobileClubsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-search/mobile-search.zod';
import { toClubSearchView } from './searchView';

export const useSearchClubs = (query: string, triggerOnEmpty = false) => {
  return useQuery<ClubSearchDocDTO[]>({
    queryKey: ['clubs', 'search', query],
    queryFn: async ({ signal }) => {
      const params = SearchMobileClubsQueryParams.parse({ query });
      const response = SearchMobileClubsResponse.parse(
        await searchMobileClubs(params, undefined, signal),
      );
      return response.items.map(toClubSearchView);
    },
    enabled: triggerOnEmpty || query.length > 0,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
