import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text } from "react-native";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSportingNavigation } from "../navigation";
import { poolLabel } from "../model/resource-sections";
import { divisionTextColor } from "../presentation";
import { SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";

/** One exact participation; the retained scene owns admission of its pool opening. */
export interface PoolParticipationLinkProps {
  pool: PoolSummaryResponse;
  active: boolean;
}

/** Compact division-colored entry preserves its published title and exact navigation target. */
export function PoolParticipationLink({
  pool,
  active,
}: PoolParticipationLinkProps) {
  const sporting = useSportingNavigation(active);
  const { colors } = useTheme();
  const division = pool.classification.division;
  const foreground = division?.color
    ? divisionTextColor(division.color)
    : colors.text;
  const label = poolLabel(pool);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void sporting.navigate("pool", pool.pool.id)}
      style={({ pressed }) => [
        styles.entry,
        {
          backgroundColor: division?.color ?? colors.subtle,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      {division ? (
        <SportingLogo
          identity={division}
          kind="division"
          size={tokens.size.icon.lg}
        />
      ) : (
        <SportingMedia
          identity={{ name: label }}
          kind="division"
          size={tokens.size.icon.lg}
        />
      )}
      <Text numberOfLines={2} style={[styles.label, { color: foreground }]}>
        {label}
      </Text>
      <ChevronRight
        accessible={false}
        size={tokens.size.icon.sm}
        color={foreground}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  entry: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  label: { ...tokens.typography.strong, flex: 1, minWidth: 0 },
});
