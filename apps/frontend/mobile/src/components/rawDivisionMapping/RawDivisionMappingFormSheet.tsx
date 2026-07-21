import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import RawDivisionMappingForm, {
  RawDivisionMappingFormExternalState
} from "@/src/components/rawDivisionMapping/RawDivisionMappingForm";
import {RawDivisionMapping} from "@/src/types/RawDivisionMapping";

export type RawDivisionMappingFormSheetProps = {
  mapping: RawDivisionMapping;
  onSuccess: () => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const RawDivisionMappingFormSheet = forwardRef<BottomSheetModal, RawDivisionMappingFormSheetProps>(
  ({mapping, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<RawDivisionMappingFormExternalState>({
      loading: false,
      canSubmit: true
    });

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: RawDivisionMappingFormExternalState) => {
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
        <RawDivisionMappingForm
          mapping={mapping}
          onSuccess={async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
  }
);

export default RawDivisionMappingFormSheet;
