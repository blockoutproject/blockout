export interface CompetitionAssociation {
    id: number;
    poolId: number;
    teamId: number;
    active: boolean;
    played: number;
    wins: number;
    losses: number;
    points: number;
    wins3To0: number;
    wins3To1: number;
    wins3To2: number;
    losses0To3: number;
    losses1To3: number;
    losses2To3: number;
    wonSets: number;
    lostSets: number;
    wonPoints: number;
    lostPoints: number;
    pointsPenalty: number;
    coefSets: number;
    coefPoints: number;
    lastUpdate: string;
}