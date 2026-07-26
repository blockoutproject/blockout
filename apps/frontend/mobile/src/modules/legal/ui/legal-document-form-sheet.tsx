import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/bottom-sheet-custom-modal";
import LegalDocumentForm, {
  LegalDocumentFormState,
} from "@/src/modules/legal/ui/legal-document-form";
import BottomSheetFormFooter from "@/src/shared/ui/form/bottom-sheet-form-footer";
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
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<LegalDocumentFormState>({
    loading: false,
    canSubmit: false,
  });

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: LegalDocumentFormState) => {
    setFooterState(s);
  }, []);

  const renderFooter = useCallback(
    (p: BottomSheetFooterProps) => (
      <BottomSheetFormFooter
        {...p}
        label={footerLabel}
        loading={footerState.loading}
        disabled={!footerState.canSubmit}
        onPress={() => submitRef.current()}
      />
    ),
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
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
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={handleStateChange}
      />
    </BottomSheetCustomModal>
  );
};

export default LegalDocumentFormSheet;
