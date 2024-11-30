export enum PoolDivisionCode {
    REG = "REG",
    NAT = "NAT",
    PRO = "PRO",
}

export enum PoolGender {
    M = "M",
    F = "F",
}

export interface Pool {
    id: number;
    poolCode: string;
    leagueCode: string;
    season: number;
    leagueName?: string;
    poolName?: string;
    divisionCode: PoolDivisionCode;
    divisionName?: string;
    gender?: PoolGender;
    rawDivisionName?: string;
    active: boolean;
    lastUpdate: Date;
}