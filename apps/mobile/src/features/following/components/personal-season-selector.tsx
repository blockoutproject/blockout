import { ChevronDown } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { FollowOptionsResponse } from "../../../../.generated/schemas/index.zod";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Controlled season trigger; its caller owns navigation and the sole accepted personal-space choice. */
export interface PersonalSeasonSelectorProps {
  options?: FollowOptionsResponse;
  seasonId?: string;
  disabled?: boolean;
  onPress: () => void;
}

/** UI Library compact pill keeps its native touch target while opening the shared native sheet route. */
export function PersonalSeasonSelector({
  options,
  seasonId,
  disabled = false,
  onPress,
}: PersonalSeasonSelectorProps) {
  const { colors } = useTheme();
  const label = !options
    ? "Saison"
    : (options.seasons.find((season) => season.id === seasonId)?.label ??
      (seasonId ? "Saison" : "Toutes saisons"));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Saison des suivis"
      accessibilityValue={{ text: label }}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.target,
        {
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      <View
        style={[
          styles.pill,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text
          style={[
            tokens.typography.label,
            { color: colors.text, flexShrink: 1 },
          ]}
        >
          {label}
        </Text>
        <ChevronDown
          accessible={false}
          size={tokens.size.icon.sm}
          color={colors.icon}
        />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  target: {
    minHeight: tokens.touch.minimum,
    justifyContent: "center",
    maxWidth: "50%",
  },
  pill: {
    minHeight: 34,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
});
