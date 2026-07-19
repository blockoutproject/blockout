import React, { forwardRef, useCallback, useRef, useState } from "react";
import { BottomSheetModal, BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import DivisionForm, { DivisionFormExternalState } from "@/src/components/division/DivisionForm";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import { Division } from "@/src/types/Division";
import { useAppTheme } from "@/src/context/ThemeProvider";

export type DivisionFormSheetProps = {
    division: Division | null;
    onSuccess: () => void;
    snapPoint?: string | number;
};

const DivisionFormSheet = forwardRef<BottomSheetModal, DivisionFormSheetProps>(
    ({ division, onSuccess, snapPoint = "90%" }, ref) => {
        const theme = useAppTheme();
        const submitRef = useRef<() => void>(() => { });
        const [footerState, setFooterState] = useState<DivisionFormExternalState>({
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

        const handleStateChange = useCallback((s: DivisionFormExternalState) => {
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
    }
);

export default DivisionFormSheet;