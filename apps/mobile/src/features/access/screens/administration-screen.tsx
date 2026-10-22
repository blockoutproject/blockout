import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { IconButton } from "../../../shared/components/icon-button";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";

/** Admission is supplied by the route owner, independently of command visibility. */
export interface AdministrationScreenProps {
  admitted: boolean;
}

/**
 * Presents each technical destination under its own literal grant, without executing an operation.
 * Settings screens and operational route admission remain with their owning F12 tasks.
 */
export function AdministrationScreen({ admitted }: AdministrationScreenProps) {
  const { permissions, hasCommands, account, sessionStatus } =
    useAdministrationCapabilities();
  const { colors } = useTheme();
  const router = useRouter();
  const linkStyle = [
    styles.command,
    {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
  ];
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.header}>
        <IconButton label="Retour" onPress={() => router.back()}>
          <Image
            accessible={false}
            source={require("../../../../assets/icons/chevron-left.svg")}
            tintColor={colors.icon}
            style={styles.backIcon}
            contentFit="contain"
          />
        </IconButton>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          Administration technique
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {!admitted ? (
          <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
        ) : sessionStatus === "restoring" ||
          (sessionStatus === "authenticated" && account.isPending) ? (
          <RequestLoading />
        ) : sessionStatus === "authenticated" && account.isError ? (
          <RequestError
            message="Les permissions du compte sont indisponibles."
            onRetry={() => void account.refetch()}
            retrying={account.isFetching}
          />
        ) : !hasCommands ? (
          <RequestError message="Cette action nécessite une permission dédiée." />
        ) : (
          <>
            {permissions?.manageMaintenance === true && (
              <Link href="/administration/maintenance" style={linkStyle}>
                Maintenance
              </Link>
            )}
            {permissions?.manageApplicationVersions === true && (
              <Link
                href="/administration/application-versions"
                style={linkStyle}
              >
                Versions minimales
              </Link>
            )}
            {permissions?.manageCollection === true && (
              <Link href="/administration/collections" style={linkStyle}>
                Collectes
              </Link>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  backIcon: { width: tokens.size.actionIcon, height: tokens.size.actionIcon },
  title: { ...tokens.typography.heading, flex: 1 },
  content: { padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  command: {
    ...tokens.typography.strong,
    minHeight: tokens.size.control,
    padding: tokens.spacing.lg,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.control,
  },
});
