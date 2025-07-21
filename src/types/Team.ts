import { Club } from "./Club";
import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";
import { EnrichedPoolDTO, Pool } from "./Pool";

export interface Team {
    id: number;
    clubId: string;
    name: string;
    shortName: string;
    leagueCode: string;
    divisionId: number;
    format: EnumFormat;
    gender: EnumGender;
    season: string;
    followersCount: number;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface TeamWithStats {
    id: number;
    name: string;
    shortName: string;
    format: EnumFormat;
    gender: EnumGender;
    season: string;
    followersCount: number;
    logoUrl: string | null;
    points: number;
    played: number;
    wins: number;
    losses: number;
    pointsPenalty: number;
    coefSets: number;
    coefPoints: number;
}

export interface EnrichedTeamDTO {
    id: number;
    name: string;
    shortName: string;
    format: EnumFormat;
    gender: EnumGender;
    season: string;
    followersCount: number;
    division: Division;
    club: Club
    pools: EnrichedPoolDTO[];
}