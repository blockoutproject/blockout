import { Pool } from "./Pool";
import { Team } from "./Team";

export enum MatchStatus {
    UPCOMING = "UPCOMING",
    FINISHED = "FINISHED",
}

export interface Match {
    id: number;
    matchCode: string;
    leagueCode: string;
    poolId: number;
    teamIdA: number;
    teamIdB: number;
    matchDate: string;
    status: MatchStatus;
    set: string | null;
    score: string | null;
    venue: string | null;
    referee1: string | null;
    referee2: string | null;
    liveCode: number | null;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface PoolMatchesDTO {
    poolId: number;
    matches: Match[];
}

export interface DayMatchesDTO {
    date: string;
    pools: PoolMatchesDTO[];
}

export interface DayPageDTO {
    dayMatches: DayMatchesDTO[];
    hasNext: boolean;
    nextPage: number | null;
}

export interface EnrichedMatch extends Match {
    teamA: Team;
    teamB: Team;
}

export interface EnrichedPoolMatchesDTO extends PoolMatchesDTO {
    poolData: Pool;
    matches: EnrichedMatch[];
}

export interface EnrichedDayMatchesDTO extends DayMatchesDTO {
    pools: EnrichedPoolMatchesDTO[];
}