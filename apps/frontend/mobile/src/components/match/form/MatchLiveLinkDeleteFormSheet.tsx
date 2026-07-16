import React, { forwardRef, useCallback, useRef, useState } from "react";
import { BottomSheetModal, BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";

import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import MatchLiveLinkDeleteForm from "@/src/components/match/form/MatchLiveLinkDeleteForm";
import { MatchLiveLinkFormExternalState } from "@/src/components/match/form/MatchLiveLinkForm";
import { useAppTheme } from "@/src/context/ThemeProvider";

export type MatchLiveLinkDeleteFormSheetProps = {
    matchId: number;
    liveUrl?: string;
    snapPoint?: string | number;
    onSuccess: () => void;
};

const MatchLiveLinkDeleteFormSheet = forwardRef<BottomSheetModal, MatchLiveLinkDeleteFormSheetProps>(
    ({ matchId, liveUrl, onSuccess, snapPoint = "90%" }, ref) => {
        const theme = useAppTheme();
        const submitRef = useRef<() => void>(() => {});
        const [footerState, setFooterState] = useState<MatchLiveLinkFormExternalState>({
            loading: false,
            canSubmit: true,
        });

        const handleRegisterSubmit = useCallback((submit: () => void) => {
            submitRef.current = submit;
        }, []);

        const handleStateChange = useCallback((s: MatchLiveLinkFormExternalState) => {
            setFooterState(s);
        }, []);

        const renderFooter = useCallback(
            (p: BottomSheetFooterProps) => (
                <BottomSheetFormFooter
                    {...p}
                    label="Supprimer"
                    loading={footerState.loading}
                    disabled={!footerState.canSubmit}
                    backgroundColor={theme.error}
                    icon="delete-outline"
                    onPress={() => submitRef.current()}
                />
            ),
            [footerState.loading, footerState.canSubmit],
        );

        return (
            <BottomSheetCustomModal
                ref={ref}
                snapPoint={snapPoint}
                footerComponent={renderFooter}
            >
                <MatchLiveLinkDeleteForm
                    matchId={matchId}
                    liveUrl={liveUrl}
                    onSuccess={async () => {
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onSuccess();
                    }}
                    onRegisterSubmit={handleRegisterSubmit}
                    onStateChange={handleStateChange}
                />
            </BottomSheetCustomModal>
        );
    },
);

export default MatchLiveLinkDeleteFormSheet;