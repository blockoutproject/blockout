import { Link } from "expo-router";
import {
  ChevronRight,
  Funnel,
  Trophy,
  type LucideIcon,
} from "lucide-react-native";
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
 * Profile shortcuts expose only delivered destinations under current grants, without route admission or bypass.
 * Division actions, technical commands and future moderation retain their independent owners.
 */
export function AdministrationEntry() {
  const { permissions, hasCommands } = useAdministrationCapabilities();
  const { colors } = useTheme();
  if (!hasCommands) return null;
  const canReadDivisions =
    permissions?.manageSportingClassification === true ||
    permissions?.manageDivisionLifecycle === true ||
    permissions?.manageSportingPresentation === true;

  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.label, { color: colors.secondaryText }]}
      >
        Administration
      </Text>
      {canReadDivisions && (
        <Link href="/administration/divisions" asChild>
          <EntryCard
            label="Divisions"
            description="Noms, logos et couleurs"
            icon={Trophy}
          />
        </Link>
      )}
      <Link href="/administration" asChild>
        <EntryCard
          label="Administration technique"
          description="Maintenance, mises à jour, collectes"
          icon={Funnel}
        />
      </Link>
    </View>
  );
}

/** Fixed approved card content; Link supplies native navigation and no permission is inferred here. */
interface EntryCardProps extends PressableProps {
  label: string;
  description: string;
  icon: LucideIcon;
}

/** Reuses the approved Account administration-card anatomy for its delivered destinations. */
function EntryCard({
  label,
  description,
  icon: Icon,
  ...props
}: EntryCardProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityLabel={label}
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
          <Icon
            accessible={false}
            size={tokens.size.icon.md}
            color={colors.icon}
            nonScalingStroke
          />
        </View>
        <ChevronRight accessible={false} size={18} color={colors.icon} />
      </View>
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {label}
      </Text>
      <Text
        style={[tokens.typography.metadata, { color: colors.secondaryText }]}
      >
        {description}
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
