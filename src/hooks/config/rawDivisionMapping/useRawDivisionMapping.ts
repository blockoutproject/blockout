import { useQuery } from '@tanstack/react-query';
import { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import ConfigApi from '@/src/api/ConfigApi';

export const useRawDivisionMappings = (
    leagueCode?: string,
    season?: number
) => {
    return useQuery<RawDivisionMapping[]>({
        queryKey: ['raw-division-mappings', leagueCode, season],
        queryFn: async () => {
            return ConfigApi.getInstance().listRawDivisionMappings(leagueCode, season);
        },
        staleTime: 1000 * 60,
        enabled: true,
    });
};