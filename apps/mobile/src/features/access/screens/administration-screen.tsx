import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { Button } from "../../../shared/components/button";
import { PageHeader } from "../../../shared/components/page-header";
import { NavigationLink } from "../../../shared/components/navigation-link";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";

/** Admission is supplied by the route owner, independently of command visibility. */
export interface AdministrationScreenProps {
  admitted: boolean;
  /** Explicit personal choice supplied only by the current root admission owner. */
  onBypass?: () => void;
}

/**
 * Presents each technical destination under its own literal grant, without executing an operation.
 * Settings screens and operational route admission remain with their owning F12 tasks.
 */
export function AdministrationScreen({
  admitted,
  onBypass,
}: AdministrationScreenProps) {
  const { permissions, hasCommands, account, sessionStatus } =
    useAdministrationCapabilities();
  const { colors } = useTheme();
  let content = null;
  if (!admitted) {
    content = (
      <RequestError message="L’accès à l’application doit être vérifié avant de continuer." />
    );
  } else if (
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isPending)
  ) {
    content = <RequestLoading />;
  } else if (sessionStatus === "authenticated" && account.isError) {
    content = (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!hasCommands && !onBypass) {
    content = (
      <RequestError message="Cette action nécessite une permission dédiée." />
    );
  } else {
    content = (
      <>
        {onBypass && (
          <Button
            label="Accéder à l’application pendant la maintenance"
            onPress={onBypass}
            fullWidth
          />
        )}
        {permissions?.manageMaintenance === true && (
          <NavigationLink
            href="/administration/maintenance"
            label="Maintenance"
          />
        )}
        {permissions?.manageApplicationVersions === true && (
          <NavigationLink
            href="/administration/application-versions"
            label="Versions minimales"
          />
        )}
        {(permissions?.manageSportingClassification === true ||
          permissions?.manageDivisionLifecycle === true ||
          permissions?.manageSportingPresentation === true) && (
          <NavigationLink href="/administration/divisions" label="Divisions" />
        )}
        {permissions?.manageCollection === true && (
          <NavigationLink href="/collection" label="Collectes" />
        )}
      </>
    );
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Administration technique" />
      <ScrollView
        contentContainerStyle={styles.content}
        alwaysBounceVertical
        refreshControl={
          admitted && sessionStatus === "authenticated" ? (
            <DataRefreshControl
              refreshing={account.isFetching}
              onRefresh={() => void account.refetch()}
            />
          ) : undefined
        }
      >
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
