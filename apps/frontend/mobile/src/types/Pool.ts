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
    rawName: string;
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
    leagueCode: string;
    leagueName: string;
}

export type PoolSearchDocDTO = {
    id: number;
    name: string;
    divisionId: number;
    divisionName: string;
    divisionMainColor: string;
    leagueCode: string;
    leagueName: string;
    logoUrl?: string;
    format: string;
    gender: string;
    season: string;
};