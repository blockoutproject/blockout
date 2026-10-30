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
import { DisclosureChevron } from "./disclosure-chevron";

/** Basic native list row; the caller owns navigation or selection semantics and unavailable state. */
export interface EntryRowProps extends PressableProps {
  label: string;
  /** A non-interactive badge stays beside the label, independently of the trailing disclosure. */
  labelAccessory?: ReactNode;
  icon?: ReactNode;
  /** Decorative radio/check or other existing row status; never a separate nested action. */
  trailing?: ReactNode;
  disclosure?: boolean;
  loading?: boolean;
}

/** Shared 48-point minimum grows with text; Link can forward its native activation unchanged. */
export function EntryRow({
  label,
  labelAccessory,
  icon,
  trailing,
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
      {(loading || icon) && (
        <View
          style={styles.icon}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {loading ? <LoadingIndicator color={colors.icon} /> : icon}
        </View>
      )}
      <View style={styles.labelGroup}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {labelAccessory}
      </View>
      {trailing && (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {trailing}
        </View>
      )}
      {typeof props.accessibilityState?.expanded === "boolean" && !trailing ? (
        <DisclosureChevron expanded={props.accessibilityState.expanded} />
      ) : disclosure ? (
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      ) : null}
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
  labelGroup: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  label: { ...tokens.typography.strong, flexShrink: 1, minWidth: 0 },
});
