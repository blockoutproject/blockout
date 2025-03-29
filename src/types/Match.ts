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
    match_date: string;
    status: MatchStatus;
    set?: string;
    score?: string;
    venue?: string;
    referee1?: string;
    referee2?: string;
    live_code?: number;
    last_update: string;
    active: boolean;
}

export interface PoolMatchesDTO {
    pool_id: number;
    matches: Match[];
}

export interface DayMatchesDTO {
    date: string;
    pools: PoolMatchesDTO[];
}

export interface DayPageDTO {
    day_matches: DayMatchesDTO[];
    has_next: boolean;
    next_page: number | null;
}