import React, { forwardRef, useCallback, useRef, useState } from "react";
import { BottomSheetModal, BottomSheetFooterProps } from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import BottomSheetCustomModal from "@/src/components/common/bottomSheet/BottomSheetCustomModal";
import LegalDocumentForm, { LegalDocumentFormExternalState } from "@/src/components/user/LegalDocumentForm";
import BottomSheetFormFooter from "@/src/components/common/form/BottomSheetFormFooter";
import type { LegalDocument } from "@/src/types/LegalDocument";

export type LegalDocumentFormSheetProps = {
    document: LegalDocument;
    onSuccess: () => void;
    snapPoint?: string | number;
    footerLabel?: string;
};

const LegalDocumentFormSheet = forwardRef<BottomSheetModal, LegalDocumentFormSheetProps>(
    ({ document, onSuccess, snapPoint = "90%", footerLabel = "Enregistrer" }, ref) => {
        const submitRef = useRef<() => void>(() => { });
        const [footerState, setFooterState] = useState<LegalDocumentFormExternalState>({
            loading: false,
            canSubmit: false,
        });

        const handleRegisterSubmit = useCallback((submit: () => void) => {
            submitRef.current = submit;
        }, []);

        const handleStateChange = useCallback((s: LegalDocumentFormExternalState) => {
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
                <LegalDocumentForm
                    document={document}
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

export default LegalDocumentFormSheet;