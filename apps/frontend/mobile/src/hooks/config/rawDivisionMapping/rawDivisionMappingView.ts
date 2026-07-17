import type {
  FormatEnum,
  GenderEnum,
  MobileRawDivisionMapping,
} from '@/src/api/generated/mobile-gateway/models';
import type { RawDivisionMapping } from '@/src/types/RawDivisionMapping';
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

/**
 * Projects a canonical raw-division response into the existing mapping view.
 *
 * @param response - Validated mobile raw-division response.
 * @returns Mapping view with the existing mobile enum identities.
 */
export function toRawDivisionMappingView(
  response: MobileRawDivisionMapping,
): RawDivisionMapping {
  return {
    id: response.id,
    rawDivisionName: response.rawDivisionName,
    divisionId: response.divisionId,
    format: response.format ? formatViewByWire[response.format] : null,
    gender: response.gender ? genderViewByWire[response.gender] : null,
    leagueCode: response.leagueCode,
    season: response.season,
  };
}
