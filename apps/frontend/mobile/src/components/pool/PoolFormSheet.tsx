import React, {forwardRef, useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import PoolForm, {PoolFormExternalState} from "@/src/components/pool/PoolForm";
import type {EnrichedPoolDTO, Pool} from "@/src/types/Pool";

export type PoolFormSheetProps = {
  pool: EnrichedPoolDTO;
  snapPoint?: string | number;
  onSuccess: (updated?: Pool) => void;
  footerLabel?: string;
};

const PoolFormSheet = forwardRef<BottomSheetModal, PoolFormSheetProps>(
  ({pool, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer"}, ref) => {
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<PoolFormExternalState>({loading: false, canSubmit: false});

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: PoolFormExternalState) => {
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
        <PoolForm
          pool={pool}
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

export default PoolFormSheet;
