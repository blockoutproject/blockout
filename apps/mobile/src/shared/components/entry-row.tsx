import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { LoadingIndicator } from "./loading-indicator";

/** Compact native navigation row; the caller owns its destination, glyph and unavailable state. */
export interface EntryRowProps extends PressableProps {
  label: string;
  icon: ReactNode;
  disclosure?: boolean;
  loading?: boolean;
}

/** Shared 48-point minimum grows with text; Link can forward its native activation unchanged. */
export function EntryRow({
  label,
  icon,
  disclosure = false,
  loading = false,
  disabled,
  style,
  ...props
}: EntryRowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: disabled || loading,
        busy: loading,
      }}
      disabled={disabled || loading}
      style={(state) => [
        styles.row,
        {
          opacity: disabled
            ? tokens.opacity.disabled
            : state.pressed
              ? tokens.opacity.pressed
              : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <View
        style={styles.icon}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        {loading ? <LoadingIndicator color={colors.icon} /> : icon}
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {disclosure && (
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control.default,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.md,
    gap: tokens.spacing.md,
  },
  icon: {
    width: tokens.size.icon.lg,
    height: tokens.size.icon.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
});
