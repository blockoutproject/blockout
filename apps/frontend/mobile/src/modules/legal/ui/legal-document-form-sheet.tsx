import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import LegalDocumentForm from "@/src/modules/legal/forms/legal-document-form";
import type { LegalDocumentResponse } from "@/src/shared/generated/models";

export type LegalDocumentFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  document: LegalDocumentResponse;
  onSuccess: () => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const LegalDocumentFormSheet: React.FC<LegalDocumentFormSheetProps> = ({
  ref,
  document,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}) => {
  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      title="Modifier le document"
      message="Mets à jour le titre, la version et le contenu Markdown."
    >
      <LegalDocumentForm
        document={document}
        onSuccess={async () => {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          onSuccess();
        }}
      />
    </FormSheet>
  );
};

export default LegalDocumentFormSheet;
