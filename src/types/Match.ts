import { EnrichedPoolDTO } from "./Pool";
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
    season: string;
    status: MatchStatus;
    set: string | null;
    score: string | null;
    venue: string | null;
    firstReferee: string | null;
    secondReferee: string | null;
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

export interface EnrichedMatchDTO {
    id: number;
    matchDate: string;
    season: string;
    status: MatchStatus;
    set: string | null;
    score: string | null;
    venue: string | null;
    firstReferee: string | null;
    secondReferee: string | null;
    liveCode: number | null;
    teamA: Team & { logoUrl: string | null };
    teamB: Team & { logoUrl: string | null };
    pool: EnrichedPoolDTO;
    documents: MatchDocumentLink[];
}

export interface EnrichedPoolMatchesDTO {
    pool: EnrichedPoolDTO;
    matches: EnrichedMatchDTO[];
}

export interface EnrichedDayMatchesDTO {
    date: string;
    pools: EnrichedPoolMatchesDTO[];
}

export interface EnrichedDayPageDTO {
    dayMatches: EnrichedDayMatchesDTO[];
    hasNext: boolean;
    nextPage: number | null;
}

export type HttpAction = {
    method: "GET" | "POST";
    encoding: "URLENCODED" | "MULTIPART";
    url: string;
    params?: { name: string; value: string }[];
};

export type MatchDocumentLink = {
    id: string;
    title: string;
    action: HttpAction;
};