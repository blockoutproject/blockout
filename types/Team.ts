export interface Team {
    id: number;
    club_id: string;
    pool_id: number;
    team_name: string;
    team_alias?: string;
    last_update?: Date;
    active: boolean;
}