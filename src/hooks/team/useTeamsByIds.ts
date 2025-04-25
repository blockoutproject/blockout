import TeamsApi from '@/src/api/TeamsApi';
import type { Team } from '@/src/types/Team';
import { useEntitiesByIds } from '../utils/useEntitiesByIds';

export const useTeamsByIds = (ids?: number[]) =>
    useEntitiesByIds<Team>('teams', (ids) => TeamsApi.getInstance().getTeamsByIds(ids), ids);
