export type LegalDocumentType = 'terms' | 'privacy' | 'imprint';

export interface LegalDocument {
    id: number;
    type: LegalDocumentType;
    title: string;
    version: string;
    content: string;
    createdAt: string;
    lastUpdate: string;
}