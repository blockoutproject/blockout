import type { CatalogDivision } from './Division';
import { EnumFormat } from './enums/Format';
import { EnumGender } from './enums/Gender';
import type { RankingTeamView, TeamWithStats } from './Team';

export interface Pool {
  id: number;
  poolCode: string;
  leagueCode: string;
  season: string;
  divisionId: number;
  gender: EnumGender;
  format: EnumFormat;
  leagueName: string;
  rawName: string;
  name: string;
  shortName: string;
  followersCount: number;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
}

export interface PoolHeaderDivisionView {
  name: string;
  logoUrl: string | null;
}

export interface PoolHeaderView {
  id: number;
  leagueCode: string;
  leagueName: string;
  shortName: string;
  gender: EnumGender;
  division: PoolHeaderDivisionView;
}

export interface RankingPoolView extends PoolHeaderView {
  ranking: RankingTeamView[];
  division: CatalogDivision;
}

export interface RankedPoolView extends RankingPoolView {
  ranking: TeamWithStats[];
}

export interface EnrichedPoolDTO extends RankedPoolView {
  season: string;
  name: string;
  rawName: string;
  followersCount: number;
}

export interface PoolSummaryDTO {
  id: number;
  name: string;
  season: string;
  gender: EnumGender;
  format: EnumFormat;
  division: CatalogDivision | null;
  leagueCode: string;
  leagueName: string;
}

/** Narrow result returned by the pool editor before its explicit detail refetch. */
export interface PoolUpdateResult {
  id: number;
  name: string;
  shortName: string;
}

export type PoolSearchDocDTO = {
  id: number;
  name: string;
  divisionId: number;
  divisionName: string;
  divisionMainColor: string;
  leagueCode: string;
  leagueName: string;
  logoUrl?: string;
  format: string;
  gender: string;
  season: string;
};
