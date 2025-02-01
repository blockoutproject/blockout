import { useMatches } from './useMatches';
import { Match } from '@/types/Match';

export function useMatchById(matchId: number): Match | undefined {
    const { flattenedMatches } = useMatches();

    return flattenedMatches.find(match => match.id === matchId);
}