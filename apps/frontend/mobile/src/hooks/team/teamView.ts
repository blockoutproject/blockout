import type {
  MobileTeamDetail,
  MobileTeamSummary,
  MobileTeamUpdated,
} from '@/src/api/generated/mobile-gateway/models';
import type {
  EnrichedTeamDTO,
  TeamSummaryDTO,
  TeamUpdateResult,
} from '@/src/types/Team';
import {
  toCatalogDivisionView,
  toFormatView,
  toGenderView,
} from '@/src/hooks/catalog/catalogView';
import { toRankedPoolView } from '@/src/hooks/pool/poolView';

export function toEnrichedTeamView(
  response: MobileTeamDetail,
): EnrichedTeamDTO {
  return {
    id: response.id,
    clubId: response.clubId,
    name: response.name,
    shortName: response.shortName,
    rawName: response.rawName,
    format: toFormatView(response.format),
    gender: toGenderView(response.gender),
    season: response.season,
    followersCount: response.followersCount,
    division: toCatalogDivisionView(response.division),
    logoUrl: response.logoUrl,
    pools: response.pools.map(toRankedPoolView),
  };
}

export function toTeamSummaryView(response: MobileTeamSummary): TeamSummaryDTO {
  return {
    id: response.id,
    name: response.name,
    shortName: response.shortName,
    season: response.season,
    gender: toGenderView(response.gender),
    format: toFormatView(response.format),
    logoUrl: response.logoUrl,
    division: response.division
      ? toCatalogDivisionView(response.division)
      : null,
  };
}

export function toTeamUpdateResult(
  response: MobileTeamUpdated,
): TeamUpdateResult {
  return {
    id: response.id,
    name: response.name,
    shortName: response.shortName,
    logoUrl: response.logoUrl,
  };
}
