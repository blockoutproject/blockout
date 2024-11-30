export enum MatchStatus {
    UPCOMING = "UPCOMING",
    FINISHED = "FINISHED",
}

export interface Match {
    id: number;
    matchCode: string;
    leagueCode: string;
    poolId: number;
    liveCode?: number;
    teamIdA: number;
    teamIdB: number;
    matchDate: Date;
    set?: string;
    score?: string;
    status: MatchStatus;
    venue?: string;
    referee1?: string;
    referee2?: string;
    active: boolean;
    lastUpdate: Date;
}