import { getMobileClub } from '@/src/api/generated/mobile-gateway/endpoints/mobile-clubs/mobile-clubs';
import {
  GetMobileClubParams,
  GetMobileClubResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-clubs/mobile-clubs.zod';
import { useEntityById } from '../utils/useEntityById';
import { Club } from '@/src/types/Club';
import { toClubView } from './clubView';

export const useClubById = (id?: string) => {
  return useEntityById<Club>(
    'clubs',
    async (clubId: string, signal?: AbortSignal) => {
      const path = GetMobileClubParams.parse({ id: clubId });
      const response = await getMobileClub(path.id, undefined, signal);
      return toClubView(GetMobileClubResponse.parse(response));
    },
    id,
  );
};
