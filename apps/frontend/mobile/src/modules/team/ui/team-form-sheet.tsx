import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/bottom-sheet-custom-modal";
import BottomSheetFormFooter from "@/src/shared/ui/form/bottom-sheet-form-footer";
import TeamForm, { TeamFormState } from "@/src/modules/team/ui/team-form";
import type {
  TeamDetailsResponse,
  TeamResponse,
} from "@/src/shared/generated/models";

export type TeamFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  team: TeamResponse;
  snapPoint?: string | number;
  onSuccess: (updated: TeamDetailsResponse) => void;
  footerLabel?: string;
};

const TeamFormSheet = ({
  ref,
  team,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}: TeamFormSheetProps) => {
  const submitRef = useRef<() => void>(() => undefined);
  const [footerState, setFooterState] = useState<TeamFormState>({
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
        actionTestID="team-form-submit-action"
      />
    ),
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  const handleSuccess = useCallback(
    async (updated: TeamDetailsResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(updated);
    },
    [onSuccess],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      contentTestID="team-form-modal"
      title="Modifier l’équipe"
      message="Mets à jour les informations visibles de cette équipe."
    >
      <TeamForm
        team={team}
        onSuccess={handleSuccess}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={setFooterState}
      />
    </BottomSheetCustomModal>
  );
};

export default TeamFormSheet;
