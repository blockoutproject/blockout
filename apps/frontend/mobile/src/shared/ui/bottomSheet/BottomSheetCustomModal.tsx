import React, {forwardRef} from "react";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import {StyleSheet, View} from "react-native";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";

export type BottomSheetModalPropsEx = Omit<BottomSheetModalProps, "children" | "snapPoints"> & {
  /** Contenu à l’intérieur de la feuille. */
  children: React.ReactNode;
  /** Point de snap unique. Active le sizing fixe si fourni. */
  snapPoint?: string | number;
};

const BottomSheetCustomModal = forwardRef<BottomSheetModal, BottomSheetModalPropsEx>(
  ({children, snapPoint, ...rest}, ref) => {
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
        handleStyle={{paddingTop: 8}}
        handleIndicatorStyle={{backgroundColor: theme.text}}
        backgroundStyle={{backgroundColor: theme.backgroundSecondary}}
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        stackBehavior="push"
        {...(snapPoint
          ? {snapPoints: [snapPoint], enableDynamicSizing: false}
          : {enableDynamicSizing: true})}
        {...rest}
      >
        <View style={styles.container}>{children}</View>
      </BottomSheetModal>
    );
  }
);

export default BottomSheetCustomModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
