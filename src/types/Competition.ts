export interface CompetitionAssociation {
    id: number;
    poolId: number;
    teamId: number;
    active: boolean;
    played: number;
    wins: number;
    losses: number;
    points: number;
    winsThreeToZero: number;
    winsThreeToOne: number;
    winsThreeToTwo: number;
    lossesZeroToThree: number;
    lossesOneToThree: number;
    lossesTwoToThree: number;
    wonSets: number;
    lostSets: number;
    wonPoints: number;
    lostPoints: number;
    pointsPenalty: number;
    coefSets: number;
    coefPoints: number;
    createdAt: string;
    lastUpdate: string;
}