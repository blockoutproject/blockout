import type {
  BottomSheetFooterProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";

import type { ReportResponse } from "@/src/shared/generated/models";
import ReportForm, {
  ReportContext,
  ReportFormState,
} from "@/src/modules/report/ui/ReportForm";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";

export type ReportFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  context?: ReportContext;
  onSuccess: (created: ReportResponse) => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const ReportFormSheet = ({
  ref,
  context,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Envoyer",
}: ReportFormSheetProps) => {
  const submitRef = useRef<() => void>(() => undefined);
  const [footerState, setFooterState] = useState<ReportFormState>({
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
        actionTestID="report-submit-action"
      />
    ),
    [footerLabel, footerState.canSubmit, footerState.loading],
  );

  const handleSuccess = useCallback(
    async (created: ReportResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(created);
    },
    [onSuccess],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      contentTestID="report-modal"
      title="Signaler un problème"
      message="Décris précisément le problème rencontré."
    >
      <ReportForm
        context={context}
        onSuccess={handleSuccess}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={setFooterState}
      />
    </BottomSheetCustomModal>
  );
};

export default ReportFormSheet;
