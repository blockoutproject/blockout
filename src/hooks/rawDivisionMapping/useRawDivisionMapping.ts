import { useQuery } from '@tanstack/react-query';
import { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
import ConfigApi from '@/src/api/ConfigApi';

/**
 * Récupère les RawDivisionMappings à mapper depuis l’API Config.
 * Peut être filtré par leagueCode ou season.
 */
export const useRawDivisionMappings = (
    leagueCode?: string,
    season?: number
) => {
    return useQuery<RawDivisionMapping[]>({
        queryKey: ['config', 'raw-division-mappings', leagueCode, season],
        queryFn: async () => {
            return ConfigApi.getInstance().listRawDivisionMappings(leagueCode, season);
        },
        staleTime: 1000 * 60,
        enabled: true,
    });
};