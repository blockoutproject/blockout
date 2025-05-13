export enum EnumTeamFormat {
    SIX = "SIX",
    FOUR = "FOUR",
}

export enum EnumTeamGender {
    M = "M",
    F = "F",
    O = "O",
}

export interface Team {
    id: number;
    clubId: string;
    poolId: number;
    name: string;
    shortName: string;
    leagueCode: string;
    divisionName: string;
    format: EnumTeamFormat;
    gender: EnumTeamGender;
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