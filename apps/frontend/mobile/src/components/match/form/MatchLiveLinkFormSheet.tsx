import React, {forwardRef, useCallback, useMemo, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import MatchLiveLinkForm, {MatchLiveLinkFormExternalState,} from "@/src/components/match/form/MatchLiveLinkForm";

export type MatchLiveLinkFormSheetProps = {
  matchId: number;
  isMatchFinished: boolean;
  initialUrl?: string | null;
  snapPoint?: string | number;
  onSuccess: () => void;
  isBeforeLiveWindow?: boolean;
};

const MatchLiveLinkFormSheet = forwardRef<BottomSheetModal, MatchLiveLinkFormSheetProps>(
  (
    {
      matchId,
      isMatchFinished,
      initialUrl,
      onSuccess,
      snapPoint = "90%",
      isBeforeLiveWindow,
    },
    ref,
  ) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<MatchLiveLinkFormExternalState>({
      loading: false,
      canSubmit: false,
    });

    const hasExisting = useMemo(() => !!initialUrl, [initialUrl]);

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: MatchLiveLinkFormExternalState) => {
      setFooterState(s);
    }, []);

    const footerLabel = useMemo(() => {
      if (hasExisting) {
        return "Mettre à jour";
      }
      return "Ajouter";
    }, [hasExisting, isMatchFinished]);

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
  },
);

export default MatchLiveLinkFormSheet;
