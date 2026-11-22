import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

export type CollectionStatusTone = "success" | "warning" | "error" | "neutral";

/** Shared badge paint; each collection view chooses the tone for its own status. */
export function CollectionStatusBadge({
  label,
  tone,
  outlined = true,
  style,
}: Readonly<{
  label: string;
  tone: CollectionStatusTone;
  outlined?: boolean;
  style?: StyleProp<TextStyle>;
}>) {
  const { colors } = useTheme();
  const [color, backgroundColor] = {
    success: [colors.onSuccessSubtle, colors.successSubtle],
    warning: [colors.warningOnSurface, colors.warningSubtle],
    error: [colors.error, colors.errorSubtle],
    neutral: [colors.secondaryText, colors.subtle],
  }[tone];
  return (
    <Text
      style={[
        styles.badge,
        {
          color,
          backgroundColor,
          borderColor: outlined ? colors.border : "transparent",
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
