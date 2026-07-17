import type {
  FormatEnum,
  GenderEnum,
  MobileCatalogDivision,
  MobileRankingTeam,
} from '@/src/api/generated/mobile-gateway/models';
import type { CatalogDivision } from '@/src/types/Division';
import type { TeamWithStats } from '@/src/types/Team';
import { EnumFormat } from '@/src/types/enums/Format';
import { EnumGender } from '@/src/types/enums/Gender';

const formatViewByWire: Record<FormatEnum, EnumFormat> = {
  SIX: EnumFormat.SIX,
  FOUR: EnumFormat.FOUR,
  TWO: EnumFormat.TWO,
};

const genderViewByWire: Record<GenderEnum, EnumGender> = {
  M: EnumGender.M,
  F: EnumGender.F,
  O: EnumGender.O,
};

/** Projects a canonical catalog division into the existing card styling view. */
export function toCatalogDivisionView(
  response: MobileCatalogDivision,
): CatalogDivision {
  return {
    name: response.name,
    mainColor: response.mainColor,
    firstGradientColor: response.firstGradientColor,
    secondGradientColor: response.secondGradientColor,
    thirdGradientColor: response.thirdGradientColor,
    logoUrl: response.logoUrl,
  };
}

/** Projects a canonical ranking row without disturbing its authoritative array position. */
export function toRankingTeamView(response: MobileRankingTeam): TeamWithStats {
  return {
    id: response.id,
    shortName: response.shortName,
    logoUrl: response.logoUrl,
    points: response.points,
    played: response.played,
    wins: response.wins,
    losses: response.losses,
    longitude: response.longitude,
    latitude: response.latitude,
  };
}

export function toFormatView(response: FormatEnum): EnumFormat {
  return formatViewByWire[response];
}

export function toGenderView(response: GenderEnum): EnumGender {
  return genderViewByWire[response];
}
