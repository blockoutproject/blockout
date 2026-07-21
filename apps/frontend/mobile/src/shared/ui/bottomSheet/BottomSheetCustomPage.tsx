import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";

export type BottomSheetPageProps = Omit<
  BottomSheetModalProps,
  "children" | "snapPoints"
> & {
  ref?: React.Ref<BottomSheetModal>;
  children: React.ReactNode;
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

const BottomSheetCustomPage = ({
  ref,
  children,
  contentTestID,
  ...rest
}: BottomSheetPageProps) => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      handleStyle={{ paddingTop: insets.top }}
      handleIndicatorStyle={{ backgroundColor: theme.text }}
      backgroundStyle={{ backgroundColor: theme.background }}
      snapPoints={["100%"]}
      stackBehavior="push"
      enablePanDownToClose
      enableDynamicSizing={false}
      {...rest}
    >
      <View style={styles.container} testID={contentTestID}>
        {children}
      </View>
    </BottomSheetModal>
  );
};

export default BottomSheetCustomPage;

const styles = StyleSheet.create({
  container: { flex: 1 },
});
