import React, { forwardRef, useMemo } from "react";
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetModalProps,
    BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/src/context/ThemeProvider";

export type BottomSheetModalPropsEx = Omit<
    BottomSheetModalProps,
    "children"
> & {
    children: React.ReactNode;
};

const BottomSheetCustomModal = forwardRef<BottomSheetModal, BottomSheetModalPropsEx>(
    ({ children, ...rest }, ref) => {
        const theme = useAppTheme();

        return (
            <BottomSheetModal
                ref={ref}
                backdropComponent={(props: BottomSheetBackdropProps) => (
                    <BottomSheetBackdrop
                        {...props}
                        appearsOnIndex={0}
                        disappearsOnIndex={-1}
                        pressBehavior="close"
                        opacity={0.5}
                    />
                )}
                handleStyle={{ paddingTop: 8 }}
                handleIndicatorStyle={{ backgroundColor: theme.text }}
                backgroundStyle={{ backgroundColor: theme.backgroundSecondary }}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                stackBehavior="push"
                enableDynamicSizing
                {...rest}
            >
                <BottomSheetView>{children}</BottomSheetView>
            </BottomSheetModal>
        );
    }
);

export default BottomSheetCustomModal;