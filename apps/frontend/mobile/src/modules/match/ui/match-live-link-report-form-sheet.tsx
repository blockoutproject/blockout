import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import MatchLiveLinkReportForm from "@/src/modules/match/forms/match-live-link-report-form";

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
  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel="Signaler"
      footerVariant="destructive"
      footerIcon="flag-outline"
      title="Signaler le direct"
      message="Explique pourquoi ce lien doit être vérifié."
    >
      <MatchLiveLinkReportForm
        matchId={matchId}
        onSuccess={() => {
          onSuccess?.();
        }}
      />
    </FormSheet>
  );
};

export default MatchLiveLinkReportFormSheet;
