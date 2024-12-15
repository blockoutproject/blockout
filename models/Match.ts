export enum MatchStatus {
    UPCOMING = "UPCOMING",
    FINISHED = "FINISHED",
}

export interface Match {
    id: number;
    match_code: string;
    league_code: string;
    pool_id: number;
    team_id_a: number;
    team_id_b: number;
    match_date: Date;
    status: MatchStatus;
    set?: string;
    score?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
    live_code?: number;
    last_update?: Date;
    active: boolean;
}