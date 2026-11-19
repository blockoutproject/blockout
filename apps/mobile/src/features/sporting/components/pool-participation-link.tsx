import { ChevronRight } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PoolSummaryResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useSportingNavigation } from "../navigation";
import { poolLabel } from "../model/resource-sections";
import { SportingLogo } from "./sporting-identity";
import { SportingMedia } from "./sporting-media";

/** One exact participation; the retained scene owns admission of its pool opening. */
export interface PoolParticipationLinkProps {
  pool: PoolSummaryResponse;
  active: boolean;
}

/** The full title wraps on the compact neutral surface. */
export function PoolParticipationLink({
  pool,
  active,
}: Readonly<PoolParticipationLinkProps>) {
  const sporting = useSportingNavigation(active);
  const { colors } = useTheme();
  const division = pool.classification.division;
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
      <View style={[styles.entry, { backgroundColor: colors.subtle }]}>
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
        <Text accessible={false} style={[styles.label, { color: colors.text }]}>
          {label}
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.secondaryText}
          strokeWidth={1.5}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { minHeight: tokens.touch.minimum, justifyContent: "center" },
  label: { ...tokens.typography.metadata, flex: 1, minWidth: 0 },
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
