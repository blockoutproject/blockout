import type { CatalogDivision } from './Division';
import { EnumFormat } from './enums/Format';
import { EnumGender } from './enums/Gender';
import type { RankedPoolView } from './Pool';

export interface Team {
  id: number;
  clubId: string;
  rawName: string;
  name: string;
  shortName: string;
  leagueCode: string;
  divisionId: number;
  format: EnumFormat;
  gender: EnumGender;
  season: string;
  logoUrl: string | null;
  followersCount: number;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
}

export interface RankingTeamView {
  id: number;
  shortName: string;
  logoUrl: string | null;
  points: number;
  played: number;
  wins: number;
  losses: number;
}

export interface TeamWithStats extends RankingTeamView {
  longitude: number | null;
  latitude: number | null;
}

export interface EnrichedTeamDTO {
  id: number;
  clubId: string;
  name: string;
  shortName: string;
  rawName: string;
  format: EnumFormat;
  gender: EnumGender;
  season: string;
  followersCount: number;
  division: CatalogDivision;
  logoUrl: string | null;
  pools: RankedPoolView[];
}

export interface TeamHighlight {
  teamId?: number;
  color: string;
}

export interface TeamSummaryDTO {
  id: number;
  name: string;
  season: string;
  gender: EnumGender;
  format: EnumFormat;
  division: CatalogDivision | null;
  logoUrl: string | null;
  shortName: string;
}

/** Narrow result returned by the team editor before its explicit detail refetch. */
export interface TeamUpdateResult {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string | null;
}

export interface TeamSearchDocDTO {
  id: number;
  name: string;
  clubId: string;
  clubName: string;
  clubCity: string;
  logoUrl: string | null;
  divisionId: number;
  divisionMainColor: string;
  divisionName: string;
  format: string;
  gender: string;
  season: string;
}
