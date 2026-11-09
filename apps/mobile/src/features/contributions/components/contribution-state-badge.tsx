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
}: Readonly<ContributionStateBadgeProps>) {
  const { colors } = useTheme();
  let backgroundColor = colors.subtle;
  let color = colors.secondaryText;
  if (state === "active") {
    backgroundColor = colors.successSubtle;
    color = colors.onSuccessSubtle;
  } else if (state === "pending") {
    backgroundColor = colors.warning;
    color = colors.onWarning;
  } else if (state === "rejected" || state === "hidden") {
    backgroundColor = colors.errorSubtle;
    color = colors.error;
  }
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
