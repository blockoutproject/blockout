export enum EnumPoolDivisionCode {
    REG = "REG",
    NAT = "NAT",
    PRO = "PRO",
}

export enum EnumPoolGender {
    M = "M",
    F = "F",
    O = "O",
}

export enum EnumPoolFormat {
    SIX = "SIX",
    FOUR = "FOUR",
}

export interface Pool {
    id: number;
    poolCode: string;
    leagueCode: string;
    season: number;
    division_code: EnumPoolDivisionCode;
    gender: EnumPoolGender;
    format: EnumPoolFormat;
    leagueName?: string;
    name?: string;
    divisionName?: string;
    rawDivisionName?: string;
    followersCount: number;
    lastUpdate: string;
    active: boolean;
}