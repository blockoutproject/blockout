import { listMobileTeamsByClub } from '@/src/api/generated/mobile-gateway/endpoints/mobile-teams/mobile-teams';
import {
  ListMobileTeamsByClubParams,
  ListMobileTeamsByClubResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-teams/mobile-teams.zod';
import { useEntityById } from '../utils/useEntityById';
import { TeamSummaryDTO } from '@/src/types/Team';
import { toTeamSummaryView } from './teamView';

export const useTeamListByClubId = (id?: string, enabled?: boolean) => {
  return useEntityById<TeamSummaryDTO[]>(
    'teamList',
    async (clubId: string, signal?: AbortSignal) => {
      const path = ListMobileTeamsByClubParams.parse({ clubId });
      const response = await listMobileTeamsByClub(
        path.clubId,
        undefined,
        signal,
      );
      return ListMobileTeamsByClubResponse.parse(response).items.map(
        toTeamSummaryView,
      );
    },
    id,
    enabled,
  );
};
