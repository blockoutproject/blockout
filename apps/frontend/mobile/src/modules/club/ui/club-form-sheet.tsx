import React, { useCallback } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import type { ClubResponse } from "@/src/shared/generated/models";
import ClubForm from "@/src/modules/club/forms/club-form";

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
  const handleSuccess = useCallback(
    async (updated: ClubResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(updated);
    },
    [onSuccess],
  );

  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      footerActionTestID="club-form-submit-action"
      contentTestID="club-form-modal"
      title="Modifier le club"
      message="Mets à jour les informations visibles de ce club."
    >
      <ClubForm club={club} onSuccess={handleSuccess} />
    </FormSheet>
  );
};

export default ClubFormSheet;
