import { useQuery } from '@tanstack/react-query';
import ConfigApi from '@/src/api/ConfigApi';
import { ScraperStatus } from '@/src/types/ScraperStatus';

export const useScraperStatuses = () => {
    return useQuery<ScraperStatus[]>({
        queryKey: ['scraper-statuses'],
        queryFn: async () => {
            return ConfigApi.getInstance().listScraperStatuses();
        },
        staleTime: 1000 * 60,
        enabled: true,
    });
};