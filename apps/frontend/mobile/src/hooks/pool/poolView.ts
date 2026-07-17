import type {
  MobilePoolDetail,
  MobilePoolSummary,
  MobilePoolUpdated,
  MobileTeamPool,
} from '@/src/api/generated/mobile-gateway/models';
import type {
  EnrichedPoolDTO,
  PoolSummaryDTO,
  PoolUpdateResult,
  RankedPoolView,
} from '@/src/types/Pool';
import {
  toCatalogDivisionView,
  toFormatView,
  toGenderView,
  toRankingTeamView,
} from '@/src/hooks/catalog/catalogView';

export function toRankedPoolView(response: MobileTeamPool): RankedPoolView {
  return {
    id: response.id,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
    shortName: response.shortName,
    gender: toGenderView(response.gender),
    ranking: response.ranking.map(toRankingTeamView),
    division: toCatalogDivisionView(response.division),
  };
}

export function toEnrichedPoolView(
  response: MobilePoolDetail,
): EnrichedPoolDTO {
  return {
    id: response.id,
    season: response.season,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
    name: response.name,
    shortName: response.shortName,
    rawName: response.rawName,
    gender: toGenderView(response.gender),
    followersCount: response.followersCount,
    ranking: response.ranking.map(toRankingTeamView),
    division: toCatalogDivisionView(response.division),
  };
}

export function toPoolSummaryView(response: MobilePoolSummary): PoolSummaryDTO {
  return {
    id: response.id,
    name: response.name,
    season: response.season,
    gender: toGenderView(response.gender),
    format: toFormatView(response.format),
    division: response.division
      ? toCatalogDivisionView(response.division)
      : null,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
  };
}

export function toPoolUpdateResult(
  response: MobilePoolUpdated,
): PoolUpdateResult {
  return {
    id: response.id,
    name: response.name,
    shortName: response.shortName,
  };
}
