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
    pool_code: string;
    league_code: string;
    season: number;
    division_code: EnumPoolDivisionCode;
    gender?: EnumPoolGender;
    format?: EnumPoolFormat;
    league_name?: string;
    pool_name?: string;
    division_name?: string;
    raw_division_name?: string;
    last_update?: Date;
    active: boolean;
}