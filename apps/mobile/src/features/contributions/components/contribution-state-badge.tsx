import { StyleSheet, Text } from "react-native";
import type { StreamContributionStateEnum } from "../../../../.generated/schemas/index.zod";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** The same textual state treatment serves personal and authorized moderator version lists. */
export interface ContributionStateBadgeProps {
  state: StreamContributionStateEnum;
  label: string;
  explanation?: string;
}

/** Reuses the personal contribution history's semantic paints, native text and growing badge geometry. */
export function ContributionStateBadge({
  state,
  label,
  explanation,
}: ContributionStateBadgeProps) {
  const { colors } = useTheme();
  const backgroundColor =
    state === "active"
      ? colors.successSubtle
      : state === "pending"
        ? colors.warning
        : state === "rejected" || state === "hidden"
          ? colors.errorSubtle
          : colors.subtle;
  const color =
    state === "active"
      ? colors.onSuccessSubtle
      : state === "pending"
        ? colors.onWarning
        : state === "rejected" || state === "hidden"
          ? colors.error
          : colors.secondaryText;
  return (
    <Text
      accessibilityHint={explanation}
      style={[
        styles.badge,
        { color, backgroundColor },
        state === "active" && {
          borderWidth: tokens.border.thin,
          borderColor: colors.onSuccessSubtle,
        },
      ]}
    >
      {label}
    </Text>
  );
}
const styles = StyleSheet.create({
  badge: {
    ...tokens.typography.metadata,
    alignSelf: "flex-start",
    minHeight: tokens.size.icon.lg,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
});
