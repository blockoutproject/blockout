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
    set?: string;
    score?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
    liveCode?: number;
    lastUpdate: string;
    active: boolean;
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
    teamA?: Team;
    teamB?: Team;
}

export interface EnrichedPoolMatchesDTO extends PoolMatchesDTO {
    poolData?: Pool;
    matches: EnrichedMatch[];
}

export interface EnrichedDayMatchesDTO extends DayMatchesDTO {
    pools: EnrichedPoolMatchesDTO[];
}