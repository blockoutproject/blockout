import React, { forwardRef } from "react";
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { View } from "react-native";

export type BottomSheetModalPropsEx = Omit<
    BottomSheetModalProps,
    "children" | "snapPoints"
> & {
    children: React.ReactNode;
    snapPoint?: string | number;
};

const BottomSheetCustomModal = forwardRef<BottomSheetModal, BottomSheetModalPropsEx>(
    ({ children, snapPoint, ...rest }, ref) => {
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
                        opacity={0.8}
                    />
                )}
                handleStyle={{ paddingTop: 8 }}
                handleIndicatorStyle={{ backgroundColor: theme.text }}
                backgroundStyle={{ backgroundColor: theme.backgroundSecondary }}
                keyboardBehavior="interactive"
                keyboardBlurBehavior="restore"
                stackBehavior="push"
                {...(snapPoint
                    ? {
                        snapPoints: [snapPoint],
                        enableDynamicSizing: false
                    }
                    : { enableDynamicSizing: true })}
                {...rest}
            >
                <View style={{ flex: 1 }}>{children}</View>
            </BottomSheetModal>
        );
    }
);

export default BottomSheetCustomModal;