import { EnumDivisionCode } from "./enums/DivisionCode";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";

export interface RawDivisionMapping {
    id: number;
    rawDivisionName: string;
    divisionCode: EnumDivisionCode | null;
    format: EnumFormat | null;
    gender: EnumGender | null;
    leagueCode: string;
    season: number;
    createdAt: string;
    lastUpdate: string;
}