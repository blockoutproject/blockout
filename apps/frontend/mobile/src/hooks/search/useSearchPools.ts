import { useQuery } from '@tanstack/react-query';
import { PoolSearchDocDTO } from '@/src/types/Pool';
import { EnumFormat } from '@/src/types/enums/Format';
import { EnumGender } from '@/src/types/enums/Gender';
import { searchMobilePools } from '@/src/api/generated/mobile-gateway/endpoints/mobile-search/mobile-search';
import {
  SearchMobilePoolsQueryParams,
  SearchMobilePoolsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-search/mobile-search.zod';
import { toPoolSearchView } from './searchView';

export const useSearchPools = (
  query: string,
  season?: string,
  divisionId?: number,
  format?: EnumFormat,
  gender?: EnumGender,
) => {
  return useQuery<PoolSearchDocDTO[]>({
    queryKey: ['pools', 'search', query, season, divisionId, format, gender],
    queryFn: async ({ signal }) => {
      const params = SearchMobilePoolsQueryParams.parse({
        query,
        season,
        divisionId,
        format,
        gender,
      });
      const response = SearchMobilePoolsResponse.parse(
        await searchMobilePools(params, undefined, signal),
      );
      return response.items.map(toPoolSearchView);
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};
