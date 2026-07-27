import React, { useCallback } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import PoolForm from "@/src/modules/pool/forms/pool-form";
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
  const handleSuccess = useCallback(
    async (updated: PoolDetailsResponse) => {
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
      footerActionTestID="pool-form-submit-action"
      contentTestID="pool-form-modal"
      title="Modifier la poule"
      message="Mets à jour les informations visibles de cette poule."
    >
      <PoolForm pool={pool} onSuccess={handleSuccess} />
    </FormSheet>
  );
};

export default PoolFormSheet;
