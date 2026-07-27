import { getLegalDocument } from "@/src/shared/generated/endpoints/config-public";
import { updateLegalDocument } from "@/src/shared/generated/endpoints/config-secure";
import type { UpdateLegalDocumentRequest } from "@/src/shared/generated/models";

/** Expose legal-document operations through the feature API boundary. */
export class LegalApi {
  /** Load a public legal document. */
  public getLegalDocument(type: string) {
    return getLegalDocument(type);
  }

  /** Update a legal document. */
  public updateLegalDocument(type: string, data: UpdateLegalDocumentRequest) {
    return updateLegalDocument(type, data);
  }
}
