import type { PoolResponse } from "@/src/modules/pool/model/Pool";
import type { TeamInternalResponse } from "@/src/modules/team/model/Team";

export enum MatchStatus {
  UPCOMING = "UPCOMING",
  FINISHED = "FINISHED",
}

export type LiveProvider = "YOUTUBE" | "TWITCH" | "FACEBOOK";

export const PROVIDER_LABELS: Record<LiveProvider, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
  FACEBOOK: "Facebook",
};

export type LiveLinkStatus =
  | "ACTIVE"
  | "DEACTIVATED"
  | "BANNED"
  | "EXPIRED"
  | "PENDING"
  | "REJECTED";

export interface MatchResponse {
  id: number;
  liveCode: number | null;
  matchDate: string;
  season: string;
  set: string | null;
  score: string | null;
  status: MatchStatus;
  venue: string | null;
  firstReferee: string | null;
  secondReferee: string | null;
  liveUrl: string | null;
  liveProvider: LiveProvider | null;
  liveOwnerAuth0Id: string | null;
  teamA: TeamInternalResponse;
  teamB: TeamInternalResponse;
  matchAddressPdfUrl: string | null;
  matchSheetPdfUrl: string | null;
  pool: PoolResponse;
}

export interface PoolMatchesResponse {
  pool: PoolResponse;
  matches: MatchResponse[];
}

export interface DayMatchesResponse {
  date: string;
  pools: PoolMatchesResponse[];
}

export interface DayPageResponse {
  dayMatches: DayMatchesResponse[];
  hasNext: boolean;
  nextPage: number | null;
}

export interface UpsertMatchLiveLinkRequest {
  url: string;
}

export interface UpsertMatchLiveLinkResponse {
  matchId: number;
  provider: LiveProvider;
  url: string;
  status: LiveLinkStatus;
  reportCount: number;
  ownerAuth0Id: string;
}

export interface ReportMatchLiveLinkRequest {
  reason: string;
}

export interface MatchLiveLinkInternalResponse {
  id: number;
  matchId: number;
  provider: LiveProvider;
  url: string;
  status: LiveLinkStatus;
  reportCount: number;
  ownerAuth0Id: string;
  createdAt: string;
  lastUpdate: string;
}

export interface MatchLiveSummaryResponse {
  id: number;
  matchDate: string | null;
  season: string | null;
  set: string | null;
  score: string | null;
  status: MatchStatus;
  liveCode: number | null;
  lastLiveLinkId: number | null;
  lastLiveLinkStatus: LiveLinkStatus | null;
  lastLiveLinkProvider: LiveProvider | null;
  lastLiveLinkUrl: string | null;
  lastLiveLinkOwnerAuth0Id: string | null;
  lastLiveLinkCreatedAt: string | null;
  teamA: TeamInternalResponse;
  teamB: TeamInternalResponse;
  pool: PoolResponse;
}
