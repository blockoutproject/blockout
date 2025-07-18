export interface TeamSearchDoc {
    id: number;
    name: string;
    clubId: string;
    clubName: string;
    clubCity: string;
    logoUrl: string | null;
    divisionName: string;
    format: string;
    gender: string;
}