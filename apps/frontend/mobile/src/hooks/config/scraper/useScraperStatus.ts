import { useQuery } from '@tanstack/react-query';
import {
  getListMobileScraperStatusesQueryKey,
  listMobileScraperStatuses,
} from '@/src/api/generated/mobile-gateway/endpoints/mobile-configuration/mobile-configuration';
import { ListMobileScraperStatusesResponse } from '@/src/api/generated/mobile-gateway/schemas/mobile-configuration/mobile-configuration.zod';
import type { ScraperStatus } from '@/src/types/ScraperStatus';
import { toScraperStatusView } from './scraperStatusView';

/** Returns validated scraper switches with the existing one-minute freshness. */
export const useScraperStatuses = () => {
  return useQuery<ScraperStatus[]>({
    queryKey: getListMobileScraperStatusesQueryKey(),
    queryFn: async ({ signal }) => {
      const response = await listMobileScraperStatuses(undefined, signal);
      return ListMobileScraperStatusesResponse.parse(response).items.map(
        toScraperStatusView,
      );
    },
    staleTime: 1000 * 60,
    enabled: true,
  });
};
