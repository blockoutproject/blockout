import { EnrichedPoolDTO } from "./Pool";
import { Team } from "./Team";

export enum MatchStatus {
    UPCOMING = "UPCOMING",
    FINISHED = "FINISHED",
}

export const PROVIDER_LABELS: Record<LiveProvider, string> = {
    YOUTUBE: "YouTube",
    TWITCH: "Twitch",
    FACEBOOK: "Facebook",
};

export type LiveProvider = "YOUTUBE" | "TWITCH" | "FACEBOOK";

export type LiveLinkStatus = "ACTIVE" | "HIDDEN" | "EXPIRED";

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
    liveUrl: string | null;
    liveProvider: string | null;
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
    liveUrl: string | null;
    liveProvider: string | null;
    matchAddressPdfUrl: string | null;
    matchSheetPdfUrl: string | null;
    liveOwnerAuth0Id: string | null;
    liveOwnerUsername: string | null;
    liveEditLocked: boolean | null;
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

export interface MatchLiveLinkRequestDTO {
    url: string;
}

export interface MatchLiveLinkResponseDTO {
    match_id: number;
    provider: LiveProvider;
    url: string;
    status: LiveLinkStatus;
}

export interface MatchLiveLinkReportRequestDTO {
    reason: string;
}