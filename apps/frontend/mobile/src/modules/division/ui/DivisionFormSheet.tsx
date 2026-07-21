import React, {useCallback, useRef, useState} from "react";
import {BottomSheetFooterProps, BottomSheetModal} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/shared/ui/bottomSheet/BottomSheetCustomModal";
import DivisionForm, {DivisionFormState} from "@/src/modules/division/ui/DivisionForm";
import BottomSheetFormFooter from "@/src/shared/ui/form/BottomSheetFormFooter";
import {DivisionResponse} from "@/src/modules/division/model/Division";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

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
    const theme = useAppTheme();
    const submitRef = useRef<() => void>(() => {
    });
    const [footerState, setFooterState] = useState<DivisionFormState>({
      loading: false,
      canSubmit: false,
      accentColor: undefined,
    });

    const footerLabel = division
      ? division.active
        ? "Modifier"
        : "Réactiver"
      : "Créer";

    const handleRegisterSubmit = useCallback((submit: () => void) => {
      submitRef.current = submit;
    }, []);

    const handleStateChange = useCallback((s: DivisionFormState) => {
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
          backgroundColor={footerState.accentColor || theme.primary}
        />
      ),
      [footerLabel, footerState.loading, footerState.canSubmit, footerState.accentColor, theme.primary]
    );

    return (
      <BottomSheetCustomModal ref={ref} snapPoint={snapPoint} footerComponent={renderFooter}>
        <DivisionForm
          division={division}
          onSuccess={async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
          }}
          onRegisterSubmit={handleRegisterSubmit}
          onStateChange={handleStateChange}
        />
      </BottomSheetCustomModal>
    );
};

export default DivisionFormSheet;
