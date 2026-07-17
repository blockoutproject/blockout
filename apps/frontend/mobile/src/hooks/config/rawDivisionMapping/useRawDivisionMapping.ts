import { useQuery } from '@tanstack/react-query';
import {
  getListMobileRawDivisionMappingsQueryKey,
  listMobileRawDivisionMappings,
} from '@/src/api/generated/mobile-gateway/endpoints/mobile-configuration/mobile-configuration';
import {
  ListMobileRawDivisionMappingsQueryParams,
  ListMobileRawDivisionMappingsResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-configuration/mobile-configuration.zod';
import type { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import { toRawDivisionMappingView } from './rawDivisionMappingView';

/**
 * Returns validated raw-division mappings for the optional owner filters.
 *
 * @param leagueCode - Optional league-code filter.
 * @param season - Optional season filter.
 */
export const useRawDivisionMappings = (
  leagueCode?: string,
  season?: string,
) => {
  const params =
    leagueCode || season
      ? ListMobileRawDivisionMappingsQueryParams.parse({ leagueCode, season })
      : undefined;

  return useQuery<RawDivisionMapping[]>({
    queryKey: getListMobileRawDivisionMappingsQueryKey(params),
    queryFn: async ({ signal }) => {
      const response = await listMobileRawDivisionMappings(
        params,
        undefined,
        signal,
      );
      return ListMobileRawDivisionMappingsResponse.parse(response).items.map(
        toRawDivisionMappingView,
      );
    },
    staleTime: 1000 * 60,
    enabled: true,
  });
};
