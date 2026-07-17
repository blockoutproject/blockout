import { getMobileTeam } from '@/src/api/generated/mobile-gateway/endpoints/mobile-teams/mobile-teams';
import {
  GetMobileTeamParams,
  GetMobileTeamResponse,
} from '@/src/api/generated/mobile-gateway/schemas/mobile-teams/mobile-teams.zod';
import { useEntityById } from '../utils/useEntityById';
import { EnrichedTeamDTO } from '@/src/types/Team';
import { toEnrichedTeamView } from './teamView';

export const useEnrichedTeamById = (id?: number, enabled?: boolean) => {
  return useEntityById<EnrichedTeamDTO>(
    'enrichedTeams',
    async (teamId: number, signal?: AbortSignal) => {
      const path = GetMobileTeamParams.parse({ id: teamId });
      const response = await getMobileTeam(path.id, undefined, signal);
      return toEnrichedTeamView(GetMobileTeamResponse.parse(response));
    },
    id,
    enabled,
  );
};
