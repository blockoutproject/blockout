import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  borderWidth,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type BottomSheetModalPropsEx = Omit<
  BottomSheetModalProps,
  "children" | "snapPoints"
> & {
  ref?: React.Ref<BottomSheetModal>;
  children: React.ReactNode;
  snapPoint?: string | number;
  contentTestID?: string;
  title?: string;
  message?: string;
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
  title,
  message,
  ...rest
}: BottomSheetModalPropsEx) => {
  const theme = useAppTheme();

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      handleStyle={styles.handle}
      handleIndicatorStyle={[
        styles.handleIndicator,
        { backgroundColor: theme.textSecondary },
      ]}
      backgroundStyle={[
        styles.background,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      stackBehavior="push"
      {...(snapPoint
        ? { snapPoints: [snapPoint], enableDynamicSizing: false }
        : { enableDynamicSizing: true })}
      {...rest}
    >
      <View style={styles.container} testID={contentTestID}>
        {title ? (
          <View style={styles.header}>
            <Text
              accessibilityRole="header"
              style={[styles.title, { color: theme.text }]}
            >
              {title}
            </Text>
            {message ? (
              <Text style={[styles.message, { color: theme.textSecondary }]}>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </View>
    </BottomSheetModal>
  );
};

export default BottomSheetCustomModal;

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: {
    borderTopWidth: borderWidth.thin,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: { paddingTop: spacing[3] },
  handleIndicator: {
    width: 48,
    height: 4,
    borderRadius: radius.full,
  },
  header: {
    gap: spacing[1],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  title: {
    ...typography.heading,
  },
  message: {
    ...typography.body,
  },
});
