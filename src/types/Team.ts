import { Division } from "./Division";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";
import { Pool } from "./Pool";

export interface Team {
    id: number;
    clubId: string;
    name: string;
    shortName: string;
    leagueCode: string;
    divisionId: number;
    format: EnumFormat;
    gender: EnumGender;
    followersCount: number;
    active: boolean;
    createdAt: string;
    lastUpdate: string;
}

export interface TeamWithPoints extends Team {
    points: number;
    wins: number;
    losses: number;
    played: number;
    pointsPenalty: number;
    coefPoints: number;
    coefSets: number;
}

export interface EnrichedTeamDTO {
    id: number;
    clubId: string;
    name: string;
    shortName: string;
    leagueCode: string;
    division: Division;
    format: EnumFormat;
    gender: EnumGender;
    followersCount: number;
    pools: Pool[];
}