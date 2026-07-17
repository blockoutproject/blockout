export type LegalDocumentType = 'terms' | 'privacy' | 'imprint';

export interface LegalDocument {
  type: LegalDocumentType;
  title: string;
  version: string;
  content: string;
}
