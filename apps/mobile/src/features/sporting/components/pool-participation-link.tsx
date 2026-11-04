import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useSportingNavigation } from "../navigation";
import { poolLabel } from "../model/resource-sections";
import { divisionTextColor } from "../presentation";
import { SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";
import { ScrollingParticipationLabel } from "./scrolling-participation-label";

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
        styles.target,
        {
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View
        style={[
          styles.entry,
          { backgroundColor: division?.color ?? colors.subtle },
        ]}
      >
        {division ? (
          <SportingLogo
            identity={division}
            kind="division"
            size={tokens.size.icon.md}
          />
        ) : (
          <SportingMedia
            identity={{ name: label }}
            kind="division"
            size={tokens.size.icon.md}
          />
        )}
        <ScrollingParticipationLabel
          label={label}
          color={foreground}
          active={active}
        />
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={foreground}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  entry: {
    minHeight: tokens.size.control.compact,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
});
