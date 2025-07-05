import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";

export interface Pool {
    id: number;
    poolCode: string;
    leagueCode: string;
    season: number;
    divisionId: number;
    gender: EnumGender;
    format: EnumFormat;
    leagueName: string;
    name: string;
    followersCount: number;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface EnrichedPoolDTO {
    id: number;
    season: number;
    leagueName: string;
    name: string;
    format: EnumFormat;
    gender: EnumGender;
    followersCount: number;
    division: Division;
}