export interface AppStatusDTO {
    maintenance: boolean;
    message: string | null;
    imageUrl: string | null;
    lastUpdate: string | null;
}

export interface AppStatusUpdateDTO {
    maintenance?: boolean;
    message?: string | null;
    imageUrl?: string | null;
}