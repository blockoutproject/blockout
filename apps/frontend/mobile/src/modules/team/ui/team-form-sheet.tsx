import React, { useCallback } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import TeamForm from "@/src/modules/team/forms/team-form";
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
  const handleSuccess = useCallback(
    async (updated: TeamDetailsResponse) => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess(updated);
    },
    [onSuccess],
  );

  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      footerActionTestID="team-form-submit-action"
      contentTestID="team-form-modal"
      title="Modifier l’équipe"
      message="Mets à jour les informations visibles de cette équipe."
    >
      <TeamForm team={team} onSuccess={handleSuccess} />
    </FormSheet>
  );
};

export default TeamFormSheet;
