import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";

export interface RawDivisionMapping {
    id: number;
    rawDivisionName: string;
    divisionId: number | null;
    format: EnumFormat | null;
    gender: EnumGender | null;
    leagueCode: string;
    season: string;
    createdAt: string;
    lastUpdate: string;
}