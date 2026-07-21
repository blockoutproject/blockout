import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import ReportForm, {ReportFormExternalState} from "@/src/components/report/ReportForm";
import {type ReportResult, ReportType} from "@/src/types/Report";

export type ReportFormSheetProps = {
  context?: {
    screen?: string;
    defaultType?: ReportType;
    userId?: string;
  };
  onSuccess: (created: ReportResult) => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const ReportFormSheet = forwardRef<BottomSheetModal, ReportFormSheetProps>(
  ({context, onSuccess, snapPoint = "90%", footerLabel = "Envoyer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<ReportFormExternalState>({loading: false, canSubmit: false});

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: ReportFormExternalState) => {
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
        />
      ),
      [footerLabel, footerState.loading, footerState.canSubmit]
    );

    return (
      <BottomSheetCustomModal ref={ref} snapPoint={snapPoint} footerComponent={renderFooter}>
        <ReportForm
          context={context}
          onSuccess={async (created) => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess(created);
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
  }
);

export default ReportFormSheet;
