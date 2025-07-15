import React, { forwardRef, useMemo } from "react";
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetModalProps,
    BottomSheetView,
} from "@gorhom/bottom-sheet";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";

export type BottomSheetPageProps = Omit<
    BottomSheetModalProps,
    "children" | "snapPoints"
> & {
    children: React.ReactNode;
};

const BottomSheetCustomPage = forwardRef<BottomSheetModal, BottomSheetPageProps>(
    ({ children, ...rest }, ref) => {
        const insets = useSafeAreaInsets();
        const theme = useAppTheme();
        const snapPoints = ["100%"];

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
                handleStyle={{ paddingTop: insets.top + 8 }}
                handleIndicatorStyle={{ backgroundColor: theme.text }}
                backgroundStyle={{ backgroundColor: theme.background }}
                snapPoints={snapPoints}
                stackBehavior="push"
                enablePanDownToClose
                enableDynamicSizing={false}
                {...rest}
            >
                <BottomSheetView style={{ flex: 1 }}>{children}</BottomSheetView>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    popupContent: {
        padding: 16,
    },
    popupHandle: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
});

export default BottomSheetCustomPage;