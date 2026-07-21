import {EnumFormat} from "@/src/shared/model/enums/Format";
import {EnumGender} from "@/src/shared/model/enums/Gender";

export interface RawDivisionMappingResponse {
  id: number;
  rawDivisionName: string;
  divisionId: number | null;
  format: EnumFormat | null;
  gender: EnumGender | null;
  leagueCode: string;
  season: string;
  createdAt: string;
  lastUpdate: string;
  mapped: boolean;
}

export interface UpdateRawDivisionMappingRequest {
  divisionId: number | null;
  format: EnumFormat | null;
  gender: EnumGender | null;
}
