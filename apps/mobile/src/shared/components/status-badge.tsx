import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export type StatusBadgeTone =
  "success" | "warning" | "strong-warning" | "error" | "neutral";

/** Renders text and its matching semantic paint for compact status labels. */
export function StatusBadge({
  label,
  tone,
  outlined = true,
  style,
}: Readonly<{
  label: string;
  tone: StatusBadgeTone;
  outlined?: boolean;
  style?: StyleProp<TextStyle>;
}>) {
  const { colors } = useTheme();
  const [color, backgroundColor] = {
    success: [colors.onSuccessSubtle, colors.successSubtle],
    warning: [colors.warningOnSurface, colors.warningSubtle],
    "strong-warning": [colors.onWarning, colors.warning],
    error: [colors.error, colors.errorSubtle],
    neutral: [colors.secondaryText, colors.subtle],
  }[tone];
  const outline = tone === "strong-warning" ? backgroundColor : colors.border;
  return (
    <Text
      style={[
        styles.badge,
        {
          color,
          backgroundColor,
          borderColor: outlined ? outline : "transparent",
        },
        style,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    ...tokens.typography.metadata,
    flexShrink: 1,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.optical,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
  },
});
