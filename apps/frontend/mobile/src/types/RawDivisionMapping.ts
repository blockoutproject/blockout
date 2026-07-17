import { EnumFormat } from './enums/Format';
import { EnumGender } from './enums/Gender';

/** Raw provider label and its optional Blockout mapping selections. */
export interface RawDivisionMapping {
  id: number;
  rawDivisionName: string;
  divisionId: number | null;
  format: EnumFormat | null;
  gender: EnumGender | null;
  leagueCode: string;
  season: string;
}
