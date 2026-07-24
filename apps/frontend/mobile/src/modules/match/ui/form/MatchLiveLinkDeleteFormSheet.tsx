import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import MatchLiveLinkDeleteForm from "@/src/modules/match/ui/form/MatchLiveLinkDeleteForm";
import { MatchLiveLinkFormState } from "@/src/modules/match/ui/form/MatchLiveLinkForm";

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
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<MatchLiveLinkFormState>({
    loading: false,
    canSubmit: true,
  });

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: MatchLiveLinkFormState) => {
    setFooterState(s);
  }, []);

  const renderFooter = useCallback(
    (p: BottomSheetFooterProps) => (
      <BottomSheetFormFooter
        {...p}
        label="Supprimer"
        loading={footerState.loading}
        disabled={!footerState.canSubmit}
        variant="destructive"
        icon="delete-outline"
        onPress={() => submitRef.current()}
      />
    ),
    [footerState.loading, footerState.canSubmit],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
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
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={handleStateChange}
      />
    </BottomSheetCustomModal>
  );
};

export default MatchLiveLinkDeleteFormSheet;
