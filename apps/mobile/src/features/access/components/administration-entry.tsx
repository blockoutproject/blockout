import { Image } from "expo-image";
import { Link } from "expo-router";
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
          <Image
            accessible={false}
            source={require("../../../../assets/icons/administration.svg")}
            tintColor={colors.icon}
            style={styles.icon}
            contentFit="contain"
          />
        </View>
        <Image
          accessible={false}
          source={require("../../../../assets/icons/chevron-right.svg")}
          tintColor={colors.icon}
          style={styles.chevron}
          contentFit="contain"
        />
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
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
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
  icon: { width: 20, height: 20 },
  chevron: { width: 18, height: 18 },
});
