import React from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { FormSheet } from "@/src/shared/ui/form/form-sheet";
import DivisionForm from "@/src/modules/division/forms/division-form";
import { DivisionResponse } from "@/src/shared/generated/models";

export type DivisionFormSheetProps = {
  ref?: React.Ref<BottomSheetModal>;
  division: DivisionResponse | null;
  onSuccess: () => void;
  snapPoint?: string | number;
};

const DivisionFormSheet: React.FC<DivisionFormSheetProps> = ({
  ref,
  division,
  onSuccess,
  snapPoint = "90%",
}) => {
  const footerLabel = division
    ? division.active
      ? "Modifier"
      : "Réactiver"
    : "Créer";

  return (
    <FormSheet
      ref={ref}
      snapPoint={snapPoint}
      footerLabel={footerLabel}
      title={division ? "Modifier la division" : "Créer une division"}
      message="Renseigne les informations utilisées pour classer les compétitions."
    >
      <DivisionForm
        division={division}
        onSuccess={async () => {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
          onSuccess();
        }}
      />
    </FormSheet>
  );
};

export default DivisionFormSheet;
