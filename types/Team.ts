export interface Team {
    id: number;
    club_id: string;
    pool_id: number;
    name: string;
    short_name: string;
    team_alias?: string;
    last_update?: Date;
    active: boolean;
}