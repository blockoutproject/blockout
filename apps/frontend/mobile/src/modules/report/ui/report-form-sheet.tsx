import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";

import type { ReportResponse } from "@/src/shared/generated/models";
import ReportForm, {
  ReportContext,
} from "@/src/modules/report/forms/report-form";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";

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
  const handleSuccess = useCallback(
    async (created: ReportResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(created);
    },
    [onSuccess],
  );

  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      footerActionTestID="report-submit-action"
      contentTestID="report-modal"
      title="Signaler un problème"
      message="Décris précisément le problème rencontré."
    >
      <ReportForm context={context} onSuccess={handleSuccess} />
    </FormSheet>
  );
};

export default ReportFormSheet;
