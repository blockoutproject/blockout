export type LegalDocumentType = "terms" | "privacy" | "imprint";

export interface LegalDocumentResponse {
  id: number;
  type: LegalDocumentType;
  title: string;
  version: string;
  content: string;
  createdAt: string;
  lastUpdate: string;
}

export interface UpdateLegalDocumentRequest {
  title: string;
  version: string;
  content: string;
}
