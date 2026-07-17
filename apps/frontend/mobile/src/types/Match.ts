import type { PoolHeaderView, RankingPoolView } from './Pool';
import type { RankingTeamView } from './Team';

export enum MatchStatus {
  UPCOMING = 'UPCOMING',
  FINISHED = 'FINISHED',
}

export const PROVIDER_LABELS: Record<LiveProvider, string> = {
  YOUTUBE: 'YouTube',
  TWITCH: 'Twitch',
  FACEBOOK: 'Facebook',
};

export type LiveProvider = 'YOUTUBE' | 'TWITCH' | 'FACEBOOK';

export type LiveLinkStatus =
  | 'ACTIVE'
  | 'DEACTIVATED'
  | 'BANNED'
  | 'EXPIRED'
  | 'PENDING'
  | 'REJECTED';

export interface MatchGradientDivisionView {
  name: string;
  firstGradientColor: string;
  secondGradientColor: string;
  thirdGradientColor: string;
}

export interface MatchListDivisionView extends MatchGradientDivisionView {
  logoUrl: string | null;
}

export interface MatchDetailDivisionView extends MatchListDivisionView {
  mainColor: string;
}

export interface MatchListTeamView {
  shortName: string;
  logoUrl: string | null;
}

export interface MatchDetailTeamView extends MatchListTeamView {
  id: number;
  name: string;
}

export interface MatchModerationTeamView {
  name: string;
  shortName: string;
  logoUrl: string | null;
}

export interface MatchListPoolView extends PoolHeaderView {
  division: MatchListDivisionView;
}

export interface MatchDetailPoolView extends RankingPoolView {
  season: string;
  poolCode: string;
  name: string;
  division: MatchDetailDivisionView;
  ranking: RankingTeamView[];
}

export interface MatchModerationPoolView {
  shortName: string;
  leagueName: string;
  division: MatchGradientDivisionView;
}

export interface MatchListItemView {
  id: number;
  matchDate: string;
  set: string | null;
  status: MatchStatus;
  liveUrl: string | null;
  teamA: MatchListTeamView | null;
  teamB: MatchListTeamView | null;
}

export interface EnrichedMatchDTO {
  id: number;
  matchDate: string;
  status: MatchStatus;
  set: string | null;
  score: string | null;
  venue: string | null;
  firstReferee: string | null;
  secondReferee: string | null;
  teamA: MatchDetailTeamView;
  teamB: MatchDetailTeamView;
  pool: MatchDetailPoolView;
  liveUrl: string | null;
  liveProvider: LiveProvider | null;
  matchAddressPdfUrl: string | null;
  matchSheetPdfUrl: string | null;
  liveOwnerAuth0Id: string | null;
}

export interface EnrichedPoolMatchesDTO {
  pool: MatchListPoolView;
  matches: MatchListItemView[];
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

export interface MatchLiveLinkDTO {
  id: number;
  provider: LiveProvider;
  url: string;
  status: LiveLinkStatus;
  reportCount: number;
  ownerAuth0Id: string;
  createdAt: string;
  lastUpdate: string | null;
}

export interface EnrichedMatchLiveSummaryDTO {
  id: number;
  matchDate: string | null; // Instant -> string ISO
  season: string | null;
  set: string | null;
  lastLiveLinkStatus: LiveLinkStatus | null;
  lastLiveLinkCreatedAt: string | null;
  teamA: MatchModerationTeamView;
  teamB: MatchModerationTeamView;
  pool: MatchModerationPoolView;
}
