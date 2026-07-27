import React, { useMemo } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import MatchLiveLinkForm from "@/src/modules/match/forms/match-live-link-form";

export type MatchLiveLinkFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  matchId: number;
  isMatchFinished: boolean;
  initialUrl?: string | null;
  snapPoint?: string | number;
  onSuccess: () => void;
  isBeforeLiveWindow?: boolean;
};

const MatchLiveLinkFormSheet: React.FC<MatchLiveLinkFormSheetProps> = ({
  ref,
  matchId,
  isMatchFinished,
  initialUrl,
  onSuccess,
  snapPoint = "90%",
  isBeforeLiveWindow,
}) => {
  const hasExisting = useMemo(() => !!initialUrl, [initialUrl]);

  const footerLabel = useMemo(() => {
    if (hasExisting) {
      return "Mettre à jour";
    }
    return "Ajouter";
  }, [hasExisting]);

  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      title={hasExisting ? "Modifier le lien de direct" : "Ajouter un direct"}
      message="Renseigne le lien fourni par la plateforme de diffusion."
    >
      <MatchLiveLinkForm
        matchId={matchId}
        isMatchFinished={isMatchFinished}
        initialUrl={initialUrl}
        isBeforeLiveWindow={isBeforeLiveWindow}
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

export default MatchLiveLinkFormSheet;
