import React, { useCallback, useMemo, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/bottom-sheet-custom-modal";
import BottomSheetFormFooter from "@/src/shared/ui/form/bottom-sheet-form-footer";
import MatchLiveLinkForm, {
  MatchLiveLinkFormState,
} from "@/src/modules/match/ui/form/match-live-link-form";

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
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<MatchLiveLinkFormState>({
    loading: false,
    canSubmit: false,
  });

  const hasExisting = useMemo(() => !!initialUrl, [initialUrl]);

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: MatchLiveLinkFormState) => {
    setFooterState(s);
  }, []);

  const footerLabel = useMemo(() => {
    if (hasExisting) {
      return "Mettre à jour";
    }
    return "Ajouter";
  }, [hasExisting]);

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
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={handleStateChange}
      />
    </BottomSheetCustomModal>
  );
};

export default MatchLiveLinkFormSheet;
