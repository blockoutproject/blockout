import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { controlOpacity } from "@/shared/components/control-styles";
import {
  StatusBadge,
  type StatusBadgeTone,
} from "@/shared/components/status-badge";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";

type RowBadge = Readonly<{ label: string; tone: StatusBadgeTone }>;

/** Pack and pool rows share one visual and accessible disclosure pattern. */
export function MappingRow({
  label,
  detail,
  badges,
  badgePlacement = "trailing",
  onPress,
}: Readonly<{
  label: string;
  detail?: string;
  badges: readonly RowBadge[];
  badgePlacement?: "trailing" | "below";
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  const status = badges.map((badge) => (
    <StatusBadge key={badge.label} {...badge} />
  ));
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[label, detail, ...badges.map((badge) => badge.label)]
        .filter(Boolean)
        .join(", ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: controlOpacity(false, pressed),
        },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          {label}
        </Text>
        {detail && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            {detail}
          </Text>
        )}
        {badgePlacement === "below" && (
          <View style={styles.badges}>{status}</View>
        )}
      </View>
      {badgePlacement === "trailing" && status}
      <ChevronRight
        accessible={false}
        size={tokens.size.icon.sm}
        color={colors.icon}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    minHeight: 60,
    padding: tokens.spacing.md,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panelInset,
  },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: tokens.spacing.xs },
});
