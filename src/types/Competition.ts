export interface CompetitionAssociation {
    id?: number;
    pool_id: number;
    team_id: number;
    active: boolean;
    played: number;
    wins: number;
    losses: number;
    points: number;
    wins_3_0: number;
    wins_3_1: number;
    wins_3_2: number;
    losses_0_3: number;
    losses_1_3: number;
    losses_2_3: number;
    won_sets: number;
    lost_sets: number;
    won_points: number;
    lost_points: number;
    points_penalty: number;
    coef_sets: number;
    coef_points: number;
    last_update: string;
}