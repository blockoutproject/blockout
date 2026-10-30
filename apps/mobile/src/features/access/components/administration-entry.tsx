import { Link } from "expo-router";
import {
  Funnel,
  Play,
  Settings,
  Smartphone,
  Trophy,
} from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { EntryGroup } from "../../../shared/components/entry-group";
import { EntryRow } from "../../../shared/components/entry-row";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { canReadDivisions } from "../division-catalog-access";

/** Profile links directly to each currently granted destination; each destination still requires its owning current capability. */
export function AdministrationEntry() {
  const { permissions, hasCommands } = useAdministrationCapabilities();
  const { colors } = useTheme();
  const canModerate = permissions?.moderateStreamLinks === true;
  if (!hasCommands && !canModerate) return null;

  return (
    <View style={styles.group}>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.label, { color: colors.secondaryText }]}
      >
        Administration
      </Text>
      <EntryGroup>
        {canReadDivisions(permissions) && (
          <Link href="/administration/divisions" asChild>
            <EntryRow
              label="Divisions"
              icon={
                <Trophy
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              }
              disclosure
            />
          </Link>
        )}
        {permissions?.manageSportingClassification === true && (
          <EntryRow
            label="Mapping des poules"
            accessibilityRole="link"
            icon={
              <Funnel
                accessible={false}
                size={tokens.size.icon.md}
                color={colors.icon}
              />
            }
            disclosure
            disabled
          />
        )}
        {canModerate && (
          <Link href="/administration/stream-links" asChild>
            <EntryRow
              label="Liens vidéo"
              icon={
                <Play
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              }
              disclosure
            />
          </Link>
        )}
        {permissions?.manageCollection === true && (
          <Link href="/collection" asChild>
            <EntryRow
              label="Collectes"
              icon={
                <Funnel
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              }
              disclosure
            />
          </Link>
        )}
        {permissions?.manageMaintenance === true && (
          <Link href="/administration/maintenance" asChild>
            <EntryRow
              label="Maintenance"
              icon={
                <Settings
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              }
              disclosure
            />
          </Link>
        )}
        {permissions?.manageApplicationVersions === true && (
          <Link href="/administration/application-versions" asChild>
            <EntryRow
              label="Versions minimales"
              icon={
                <Smartphone
                  accessible={false}
                  size={tokens.size.icon.md}
                  color={colors.icon}
                />
              }
              disclosure
            />
          </Link>
        )}
      </EntryGroup>
    </View>
  );
}

const styles = StyleSheet.create({ group: { gap: tokens.spacing.md } });
