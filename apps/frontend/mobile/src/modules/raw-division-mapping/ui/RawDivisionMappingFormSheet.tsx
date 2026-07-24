import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import RawDivisionMappingForm, {
  RawDivisionMappingFormState,
} from "@/src/modules/raw-division-mapping/ui/RawDivisionMappingForm";
import { RawDivisionMappingResponse } from "@/src/shared/generated/models";

export type RawDivisionMappingFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  mapping: RawDivisionMappingResponse;
  onSuccess: () => void;
  snapPoint?: string | number;
  footerLabel?: string;
};

const RawDivisionMappingFormSheet: React.FC<
  RawDivisionMappingFormSheetProps
> = ({
  ref,
  mapping,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}) => {
  const submitRef = useRef<() => void>(() => {});
  const [footerState, setFooterState] = useState<RawDivisionMappingFormState>({
    loading: false,
    canSubmit: true,
  });

  const handleRegisterSubmit = useCallback((submit: () => void) => {
    submitRef.current = submit;
  }, []);

  const handleStateChange = useCallback((s: RawDivisionMappingFormState) => {
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
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  return (
    <BottomSheetCustomModal
      ref={ref}
      snapPoint={snapPoint}
      footerComponent={renderFooter}
      title="Mapper la division brute"
      message="Associe la valeur collectée à la division canonique correspondante."
    >
      <RawDivisionMappingForm
        mapping={mapping}
        onSuccess={async () => {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          onSuccess();
        }}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={handleStateChange}
      />
    </BottomSheetCustomModal>
  );
};

export default RawDivisionMappingFormSheet;
