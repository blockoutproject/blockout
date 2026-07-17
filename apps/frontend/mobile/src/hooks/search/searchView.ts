import type {
  MobileClubSearchResult,
  MobilePoolSearchResult,
  MobileTeamSearchResult,
} from '@/src/api/generated/mobile-gateway/models';
import type { ClubSearchDocDTO } from '@/src/types/Club';
import type { PoolSearchDocDTO } from '@/src/types/Pool';
import type { TeamSearchDocDTO } from '@/src/types/Team';
import { toFormatView, toGenderView } from '@/src/hooks/catalog/catalogView';

export function toClubSearchView(
  response: MobileClubSearchResult,
): ClubSearchDocDTO {
  return {
    id: response.id,
    name: response.name,
    logoUrl: response.logoUrl,
    city: response.city,
  };
}

export function toTeamSearchView(
  response: MobileTeamSearchResult,
): TeamSearchDocDTO {
  return {
    id: response.id,
    name: response.name,
    logoUrl: response.logoUrl,
    divisionName: response.divisionName,
    format: response.format ? toFormatView(response.format) : null,
    gender: response.gender ? toGenderView(response.gender) : null,
    season: response.season,
  };
}

export function toPoolSearchView(
  response: MobilePoolSearchResult,
): PoolSearchDocDTO {
  return {
    id: response.id,
    name: response.name,
    divisionName: response.divisionName,
    leagueCode: response.leagueCode,
    leagueName: response.leagueName,
    season: response.season,
    format: response.format ? toFormatView(response.format) : null,
    gender: response.gender ? toGenderView(response.gender) : null,
    logoUrl: response.logoUrl,
  };
}
