import React, { useCallback, useRef, useState } from "react";
import { BottomSheetFooterProps, BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import PoolForm, { PoolFormState } from "@/src/modules/pool/ui/PoolForm";
import type {
  PoolDetailsResponse,
  PoolResponse,
} from "@/src/shared/generated/models";

export type PoolFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  pool: PoolResponse;
  snapPoint?: string | number;
  onSuccess: (updated: PoolDetailsResponse) => void;
  footerLabel?: string;
};

const PoolFormSheet = ({
  ref,
  pool,
  onSuccess,
  snapPoint = "90%",
  footerLabel = "Enregistrer",
}: PoolFormSheetProps) => {
  const submitRef = useRef<() => void>(() => undefined);
  const [footerState, setFooterState] = useState<PoolFormState>({
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
        actionTestID="pool-form-submit-action"
      />
    ),
    [footerLabel, footerState.loading, footerState.canSubmit],
  );

  const handleSuccess = useCallback(
    async (updated: PoolDetailsResponse) => {
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
      contentTestID="pool-form-modal"
    >
      <PoolForm
        pool={pool}
        onSuccess={handleSuccess}
        onRegisterSubmit={handleRegisterSubmit}
        onStateChange={setFooterState}
      />
    </BottomSheetCustomModal>
  );
};

export default PoolFormSheet;
