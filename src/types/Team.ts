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
    club_id: string;
    pool_id: number;
    name: string;
    short_name: string;
    league_code: string;
    division_name: string;
    format: EnumTeamFormat;
    gender: EnumTeamGender;
    followers_count: number;
    last_update: string;
    active: boolean;
}

export interface TeamWithPoints extends Team {
    points: number;
    wins: number;
    losses: number;
    played: number;
    points_penalty: number;
    coef_points: number;
    coef_sets: number;
}