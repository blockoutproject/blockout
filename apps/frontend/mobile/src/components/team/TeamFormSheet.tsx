import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import TeamForm, {TeamFormExternalState} from "@/src/components/team/TeamForm";
import type {EnrichedTeamDTO, Team} from "@/src/types/Team";

export type TeamFormSheetProps = {
  team: EnrichedTeamDTO;
  snapPoint?: string | number;
  onSuccess: (updated?: Team) => void;
  footerLabel?: string;
};

const TeamFormSheet = forwardRef<BottomSheetModal, TeamFormSheetProps>(
  ({team, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<TeamFormExternalState>({loading: false, canSubmit: false});

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: TeamFormExternalState) => {
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
        <TeamForm
          team={team}
          onSuccess={async (u) => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess(u);
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
  }
);

export default TeamFormSheet;
