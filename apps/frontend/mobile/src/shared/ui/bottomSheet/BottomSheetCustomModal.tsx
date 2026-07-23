import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import React from "react";
import { StyleSheet, View } from "react-native";

import {useAppTheme} from "@/src/shared/theme";

export type BottomSheetModalPropsEx = Omit<
  BottomSheetModalProps,
  "children" | "snapPoints"
> & {
  ref?: React.Ref<BottomSheetModal>;
  children: React.ReactNode;
  snapPoint?: string | number;
  contentTestID?: string;
};

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    appearsOnIndex={0}
    disappearsOnIndex={-1}
    pressBehavior="close"
    opacity={0.8}
  />
);

const BottomSheetCustomModal = ({
  ref,
  children,
  snapPoint,
  contentTestID,
  ...rest
}: BottomSheetModalPropsEx) => {
  const theme = useAppTheme();

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      handleStyle={styles.handle}
      handleIndicatorStyle={{ backgroundColor: theme.text }}
      backgroundStyle={{ backgroundColor: theme.backgroundSecondary }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      stackBehavior="push"
      {...(snapPoint
        ? { snapPoints: [snapPoint], enableDynamicSizing: false }
        : { enableDynamicSizing: true })}
      {...rest}
    >
      <View style={styles.container} testID={contentTestID}>
        {children}
      </View>
    </BottomSheetModal>
  );
};

export default BottomSheetCustomModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: { paddingTop: 8 },
});
