import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";

import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import MatchLiveLinkReportForm, {
  MatchLiveLinkReportFormExternalState,
} from "@/src/components/match/form/MatchLiveLinkReportForm";
import {useAppTheme} from "@/src/context/ThemeProvider";

export type MatchLiveLinkReportSheetProps = {
  matchId: number;
  onSuccess?: () => void;
  snapPoint?: string | number;
};

const MatchLiveLinkReportFormSheet = forwardRef<BottomSheetModal, MatchLiveLinkReportSheetProps>(
  ({matchId, onSuccess, snapPoint = "90%"}, ref) => {
    const theme = useAppTheme();
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<MatchLiveLinkReportFormExternalState>({
      loading: false,
      canSubmit: false,
    });

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: MatchLiveLinkReportFormExternalState) => {
      setFooterState(s);
    }, []);

    const renderFooter = useCallback(
      (p: BottomSheetFooterProps) => (
        <BottomSheetFormFooter
          {...p}
          label="Signaler"
          loading={footerState.loading}
          disabled={!footerState.canSubmit}
          onPress={() => submitRef.current()}
          backgroundColor={theme.error}
          icon="flag-outline"
        />
      ),
      [footerState.loading, footerState.canSubmit],
    );

    return (
      <BottomSheetCustomModal
        ref={ref}
        snapPoint={snapPoint}
        footerComponent={renderFooter}
      >
        <MatchLiveLinkReportForm
          matchId={matchId}
          onSuccess={() => {
            onSuccess?.();
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
  },
);

export default MatchLiveLinkReportFormSheet;
