import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/bottom-sheet-custom-modal";
import DivisionForm, {
  DivisionFormState,
} from "@/src/modules/division/ui/division-form";
import BottomSheetFormFooter from "@/src/shared/ui/form/bottom-sheet-form-footer";
import { DivisionResponse } from "@/src/shared/generated/models";

export type DivisionFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  division: DivisionResponse | null;
  onSuccess: () => void;
  snapPoint?: string | number;
};

const DivisionFormSheet: React.FC<DivisionFormSheetProps> = ({
  ref,
  division,
  onSuccess,
  snapPoint = "90%",
}) => {
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<DivisionFormState>({
    loading: false,
    canSubmit: false,
    accentColor: undefined,
  });

  const footerLabel = division
    ? division.active
      ? "Modifier"
      : "Réactiver"
    : "Créer";

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: DivisionFormState) => {
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
        gradient={
          footerState.accentColor
            ? [
                footerState.accentColor,
                footerState.accentColor,
                footerState.accentColor,
              ]
            : undefined
        }
      />
    ),
    [
      footerLabel,
      footerState.loading,
      footerState.canSubmit,
      footerState.accentColor,
    ],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      title={division ? "Modifier la division" : "Créer une division"}
      message="Renseigne les informations utilisées pour classer les compétitions."
    >
      <DivisionForm
        division={division}
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

export default DivisionFormSheet;
