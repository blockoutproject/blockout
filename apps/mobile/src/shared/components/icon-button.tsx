import type { PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

/** Plain icon action with a required caller-owned name and decorative 24 px content. */
export interface IconButtonProps extends PropsWithChildren {
  label: string;
  onPress: PressableProps["onPress"];
  disabled?: boolean;
  loading?: boolean;
}

/** Uses the platform's source-owned target; loading replaces the glyph and prevents activation. */
export function IconButton({
  label,
  onPress,
  children,
  disabled = false,
  loading = false,
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

const target =
  Platform.OS === "android"
    ? tokens.touchTarget.android
    : tokens.touchTarget.ios;
const styles = StyleSheet.create({
  action: {
    width: target,
    minHeight: target,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: tokens.size.actionIcon,
    height: tokens.size.actionIcon,
    alignItems: "center",
    justifyContent: "center",
  },
});
