import { Link } from "expo-router";
import { ChevronRight, Trophy } from "lucide-react-native";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";

/**
 * Profile entry for current technical commands only; visibility grants no route admission or bypass.
 * Sporting, moderation, Pro and legal powers retain their independent owners.
 */
export function AdministrationEntry() {
  const { hasCommands } = useAdministrationCapabilities();
  const { colors } = useTheme();
  if (!hasCommands) return null;

  return (
    <View style={styles.group}>
      <Text style={[tokens.typography.label, { color: colors.secondaryText }]}>
        Administration
      </Text>
      <Link href="/administration" asChild>
        <EntryCard />
      </Link>
    </View>
  );
}

/** Approved Account 4868:5908 card; forwards Link's native activation and accessibility props. */
function EntryCard(props: PressableProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel="Administration technique"
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.raised,
          borderColor: colors.border,
          opacity: pressed ? tokens.opacity.pressed : 1,
        },
      ]}
    >
      <View style={styles.disclosure}>
        <View style={[styles.tile, { backgroundColor: colors.subtle }]}>
          <Trophy
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
            nonScalingStroke
          />
        </View>
        <ChevronRight accessible={false} size={18} color={colors.icon} />
      </View>
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        Administration technique
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        Maintenance, mises à jour, collectes
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.spacing.md },
  card: {
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.panel,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tile: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
});
