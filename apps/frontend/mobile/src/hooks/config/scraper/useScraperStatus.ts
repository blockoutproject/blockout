import {useQuery} from '@tanstack/react-query';
import {ScraperStatus} from '@/src/types/ScraperStatus';
import {useApis} from '@/src/shared/providers/ApiProvider';

export const useScraperStatuses = () => {
  const {mobile} = useApis();

  return useQuery<ScraperStatus[]>({
    queryKey: ['scraper-statuses'],
    queryFn: async () => {
      return mobile.config.getScraperStatuses();
    },
    staleTime: 1000 * 60,
    enabled: true,
  });
};
