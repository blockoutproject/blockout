import { Club } from "./Club";
import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";
import { EnrichedPoolDTO, Pool } from "./Pool";

export interface Team {
    id: number;
    clubId: string;
    rawName: string;
    name: string;
    shortName: string;
    leagueCode: string;
    divisionId: number;
    format: EnumFormat;
    gender: EnumGender;
    season: string;
    logoUrl: string | null;
    followersCount: number;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface TeamWithStats {
    id: number;
    name: string;
    shortName: string;
    logoUrl: string | null;
    points: number;
    played: number;
    wins: number;
    losses: number;
    pointsPenalty: number;
    coefSets: number;
    coefPoints: number;
    longitude: number | null;
    latitude: number | null;
}

export interface EnrichedTeamDTO {
    id: number;
    clubId: string
    name: string;
    shortName: string;
    rawName: string;
    format: EnumFormat;
    gender: EnumGender;
    season: string;
    followersCount: number;
    division: Division;
    logoUrl: string;
    pools: EnrichedPoolDTO[];
}

export interface TeamHighlight {
    teamId?: number;
    color: string
};

export interface TeamSummaryDTO {
    id: number;
    name: string;
    season: string;
    gender: EnumGender;
    format: EnumFormat;
    division: Division;
    logoUrl: string;
    shortName: string;
}

export interface TeamSearchDocDTO {
    id: number;
    name: string;
    clubId: string;
    clubName: string;
    clubCity: string;
    logoUrl: string | null;
    divisionId: number;
    divisionMainColor: string;
    divisionName: string;
    format: string;
    gender: string;
    season: string;
}