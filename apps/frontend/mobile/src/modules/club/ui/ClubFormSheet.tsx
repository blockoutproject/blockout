import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import type { ClubResponse } from "@/src/shared/generated/models";
import ClubForm, { ClubFormState } from "@/src/modules/club/ui/ClubForm";

export type ClubFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  club: ClubResponse;
  snapPoint?: string | number;
  onSuccess: (updated: ClubResponse) => void;
  footerLabel?: string;
};

const ClubFormSheet = ({
  ref,
  club,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}: ClubFormSheetProps) => {
  const submitRef = useRef<() => void>(() => undefined);
  const [footerState, setFooterState] = useState<ClubFormState>({
    loading: false,
    canSubmit: false,
  });

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFormFooter
        {...props}
        label={footerLabel}
        loading={footerState.loading}
        disabled={!footerState.canSubmit}
        onPress={() => submitRef.current()}
        actionTestID="club-form-submit-action"
      />
    ),
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  const handleSuccess = useCallback(
    async (updated: ClubResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(updated);
    },
    [onSuccess],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      contentTestID="club-form-modal"
      title="Modifier le club"
      message="Mets à jour les informations visibles de ce club."
    >
      <ClubForm
        club={club}
        onSuccess={handleSuccess}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={setFooterState}
      />
    </BottomSheetCustomModal>
  );
};

export default ClubFormSheet;
