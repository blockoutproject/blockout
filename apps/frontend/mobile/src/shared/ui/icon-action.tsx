import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import {
  borderWidth,
  radius,
  stateOpacity,
  touchTarget,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";

export type IconActionTreatment = "plain" | "surface" | "destructive";

export type IconActionProps = {
  accessibilityLabel: string;
  children: React.ReactNode;
  onPress: () => Promise<void> | void;
  treatment?: IconActionTreatment;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
};

/**
 * Owns the bounded native interaction contract for icon-only actions.
 */
export function IconAction({
  accessibilityLabel,
  children,
  onPress,
  treatment = "plain",
  disabled,
  loading,
  testID,
}: IconActionProps) {
  const theme = useAppTheme();
  const isDisabled = Boolean(disabled || loading);
  const indicatorColor =
    treatment === "destructive" ? theme.error : theme.textInactive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        busy: Boolean(loading),
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.target,
        treatment === "surface"
          ? [
              styles.surface,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]
          : undefined,
        treatment === "destructive"
          ? [
              styles.surface,
              {
                backgroundColor: withAlpha(theme.error, 0.1),
                borderColor: theme.error,
              },
            ]
          : undefined,
        {
          opacity: isDisabled
            ? loading
              ? stateOpacity.loading
              : stateOpacity.disabled
            : pressed
              ? stateOpacity.pressed
              : 1,
        },
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator size="small" color={indicatorColor} />
      ) : (
        <View pointerEvents="none">{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: touchTarget.minimum,
    height: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  surface: {
    borderWidth: borderWidth.thin,
  },
});
