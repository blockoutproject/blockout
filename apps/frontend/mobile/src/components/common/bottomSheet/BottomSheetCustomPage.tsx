import React, {forwardRef} from "react";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {StyleSheet, View} from "react-native";
import {useAppTheme} from "@/src/context/ThemeProvider";

export type BottomSheetPageProps = Omit<BottomSheetModalProps, "children" | "snapPoints"> & {
  /** Contenu pleine page. */
  children: React.ReactNode;
};

const BottomSheetCustomPage = forwardRef<BottomSheetModal, BottomSheetPageProps>(
  ({children, ...rest}, ref) => {
    const insets = useSafeAreaInsets();
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
        handleStyle={{paddingTop: insets.top}}
        handleIndicatorStyle={{backgroundColor: theme.text}}
        backgroundStyle={{backgroundColor: theme.background}}
        snapPoints={["100%"]}
        stackBehavior="push"
        enablePanDownToClose
        enableDynamicSizing={false}
        {...rest}
      >
        <View style={styles.container}>{children}</View>
      </BottomSheetModal>
    );
  }
);

export default BottomSheetCustomPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
