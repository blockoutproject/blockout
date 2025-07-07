import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";
import { TeamWithStats } from "./Team";

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
    ranking: TeamWithStats[];
    division: Division;
}