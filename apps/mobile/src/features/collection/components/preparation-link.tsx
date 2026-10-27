import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
/** Navigation identity with an accessible action and decorative approved Lucide glyphs. */
export function PreparationLink({
  label,
  detail,
  icon: Icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: LucideIcon;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? tokens.opacity.pressed : 1,
      })}
    >
      <Surface>
        <View style={styles.link}>
          <Icon
            accessible={false}
            size={tokens.size.icon.lg}
            color={colors.icon}
          />
          <View style={styles.identity}>
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
          </View>
          <ChevronRight
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
          />
        </View>
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.lg,
  },
  identity: { flex: 1, gap: tokens.spacing.xs },
});
