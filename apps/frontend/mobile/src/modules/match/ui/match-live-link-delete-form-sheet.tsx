import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import MatchLiveLinkDeleteForm from "@/src/modules/match/forms/match-live-link-delete-form";

export type MatchLiveLinkDeleteFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  matchId: number;
  liveUrl?: string;
  snapPoint?: string | number;
  onSuccess: () => void;
};

const MatchLiveLinkDeleteFormSheet: React.FC<
  MatchLiveLinkDeleteFormSheetProps
> = ({ ref, matchId, liveUrl, onSuccess, snapPoint = "90%" }) => {
  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel="Supprimer"
      footerVariant="destructive"
      footerIcon="delete-outline"
      title="Supprimer le lien de direct"
      message="Vérifie le lien avant de confirmer cette action irréversible."
    >
      <MatchLiveLinkDeleteForm
        matchId={matchId}
        liveUrl={liveUrl}
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

export default MatchLiveLinkDeleteFormSheet;
