import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

/** Plain icon action with a required caller-owned name and decorative glyph content. */
export interface IconButtonProps extends PropsWithChildren {
  label: string;
  onPress: PressableProps["onPress"];
  disabled?: boolean;
  loading?: boolean;
  /** Search clear actions fill the approved 48-point control; ordinary actions use the platform minimum. */
  size?: "platform" | "control";
}

/** Uses the platform's source-owned target; loading replaces the glyph and prevents activation. */
export function IconButton({
  label,
  onPress,
  children,
  disabled = false,
  loading = false,
  size = "platform",
}: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        size === "control" && styles.control,
        {
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      <View
        style={styles.icon}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {loading ? <LoadingIndicator color={colors.icon} /> : children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: tokens.touch.minimum,
    minHeight: tokens.touch.minimum,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: tokens.size.icon.lg,
    height: tokens.size.icon.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  control: {
    width: tokens.size.control.default,
    minHeight: tokens.size.control.default,
  },
});
