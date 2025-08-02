import React, { forwardRef } from "react";
import {
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetModal,
    BottomSheetModalProps,
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
                        opacity={0.8}
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
                <View style={{ flex: 1 }}>{children}</View>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({

});

export default BottomSheetCustomPage;