import { EnumDivisionCode } from "./enums/DivisionCode";
import { EnumFormat } from "./enums/Format";
import { EnumGender } from "./enums/Gender";

export interface Team {
    id: number;
    clubId: string;
    poolId: number;
    name: string;
    shortName: string;
    leagueCode: string;
    divisionCode: EnumDivisionCode;
    format: EnumFormat;
    gender: EnumGender;
    followersCount: number;
    lastUpdate: string;
    active: boolean;
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