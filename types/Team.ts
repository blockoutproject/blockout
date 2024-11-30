export interface Team {
    id: number;
    clubId: string;
    poolId: number;
    teamName: string;
    teamAlias?: string;
    active: boolean;
    lastUpdate: Date;
}