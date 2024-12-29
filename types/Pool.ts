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
    pool_code: string;
    league_code: string;
    season: number;
    division_code: PoolDivisionCode;
    gender?: PoolGender;
    league_name?: string;
    pool_name?: string;
    division_name?: string;
    raw_division_name?: string;
    last_update?: Date;
    active: boolean;
}