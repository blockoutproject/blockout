import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";
import { TeamWithStats } from "./Team";

export interface Pool {
    id: number;
    poolCode: string;
    leagueCode: string;
    season: string;
    divisionId: number;
    gender: EnumGender;
    format: EnumFormat;
    leagueName: string;
    rawName: string;
    name: string;
    shortName: string;
    followersCount: number;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface EnrichedPoolDTO {
    id: number;
    season: string;
    leagueCode: string;
    leagueName: string;
    poolCode: string;
    name: string;
    shortName: string;
    format: EnumFormat;
    gender: EnumGender;
    followersCount: number;
    ranking: TeamWithStats[];
    division: Division;
}

export interface PoolSummaryDTO {
    id: number;
    name: string;
    shortName: string;
    season: string;
    gender: EnumGender;
    format: EnumFormat;
    division: Division;
    leagueName: string;
}