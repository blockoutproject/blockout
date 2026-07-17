import { getMobileMatch } from '@/src/api/generated/mobile-gateway/endpoints/mobile-matches/mobile-matches';
import {
  GetMobileMatchParams,
  GetMobileMatchResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-matches/mobile-matches.zod';
import { useEntityById } from '../utils/useEntityById';
import { EnrichedMatchDTO } from '@/src/types/Match';
import { toEnrichedMatchView } from './matchView';

export const useEnrichedMatchById = (id?: number) => {
  return useEntityById<EnrichedMatchDTO>(
    'enrichedMatches',
    async (matchId: number, signal?: AbortSignal) => {
      const path = GetMobileMatchParams.parse({ id: matchId });
      const response = await getMobileMatch(path.id, undefined, signal);
      return toEnrichedMatchView(GetMobileMatchResponse.parse(response));
    },
    id,
  );
};
