import { useActionFeedback } from "@/shared/components/action-feedback";
import { openLegalDocument, type LegalDocument } from "./open-legal-document";

/** Shares safe opening feedback across existing account entries; retry is another explicit press. */
export function useLegalDocuments() {
  const feedback = useActionFeedback();

  /** Hands reading to the browser and leaves late errors to the original mounted feedback owner. */
  function open(document: LegalDocument) {
    feedback.clear();
    void openLegalDocument(document).catch(() =>
      feedback.error("Impossible d’ouvrir ce document. Réessayez."),
    );
  }

  return open;
}
