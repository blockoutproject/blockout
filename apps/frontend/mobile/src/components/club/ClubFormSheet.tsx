import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import ClubForm, {ClubFormExternalState} from "@/src/components/club/ClubForm";
import type {Club} from "@/src/types/Club";

export type ClubFormSheetProps = {
  club: Club;
  snapPoint?: string | number;
  onSuccess: (updated?: Club) => void;
  footerLabel?: string;
};

const ClubFormSheet = forwardRef<BottomSheetModal, ClubFormSheetProps>(
  ({club, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<ClubFormExternalState>({loading: false, canSubmit: false});

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: ClubFormExternalState) => {
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
        <ClubForm
          club={club}
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

export default ClubFormSheet;
