import { EnumDivisionCode } from "./enums/DivisionCode";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";

export interface Pool {
    id: number;
    poolCode: string;
    leagueCode: string;
    season: number;
    division_code: EnumDivisionCode;
    gender: EnumGender;
    format: EnumFormat;
    leagueName?: string;
    name?: string;
    divisionName?: string;
    followersCount: number;
    lastUpdate: string;
    active: boolean;
}