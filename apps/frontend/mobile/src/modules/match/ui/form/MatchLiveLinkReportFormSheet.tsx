import React, {useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";

import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import MatchLiveLinkReportForm, {
  MatchLiveLinkReportFormState,
} from "@/src/modules/match/ui/form/MatchLiveLinkReportForm";
import {useAppTheme} from "@/src/shared/theme";

export type MatchLiveLinkReportSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  matchId: number;
  onSuccess?: () => void;
  snapPoint?: string | number;
};

const MatchLiveLinkReportFormSheet: React.FC<MatchLiveLinkReportSheetProps> = ({
  ref,
  matchId,
  onSuccess,
  snapPoint = "90%",
}) => {
    const theme = useAppTheme();
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<MatchLiveLinkReportFormState>({
      loading: false,
      canSubmit: false,
    });

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: MatchLiveLinkReportFormState) => {
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
      [footerState.loading, footerState.canSubmit, theme.error],
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
};

export default MatchLiveLinkReportFormSheet;
