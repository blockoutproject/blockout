import {useQuery} from '@tanstack/react-query';
import {RawDivisionMapping} from '@/src/types/RawDivisionMapping';
import {useApis} from '@/src/context/ApiProvider';

export const useRawDivisionMappings = (
  leagueCode?: string,
  season?: string
) => {
  const {mobile} = useApis();

  return useQuery<RawDivisionMapping[]>({
    queryKey: ['raw-division-mappings', leagueCode, season],
    queryFn: async () => {
      return mobile.config.getRawDivisionMappings(leagueCode, season);
    },
    staleTime: 1000 * 60,
    enabled: true,
  });
};
