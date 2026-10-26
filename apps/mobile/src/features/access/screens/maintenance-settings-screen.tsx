import { StyleSheet } from "react-native";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../../shared/components/page-header";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { MaintenanceForm } from "../forms/maintenance-form";

/** Loads only with current grants and retains an existing draft read-only when they become unavailable. */
export function MaintenanceSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);
  const { colors } = useTheme();
  const settings =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  let accessError = null;
  if (account.isError) {
    accessError = (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!canManage) {
    accessError = (
      <RequestError message="Cette action nécessite une permission dédiée." />
    );
  }
  let settingsContent = null;
  if (settings) {
    settingsContent = (
      <MaintenanceForm
        key={`${session.generation}:${session.accountId}`}
        settings={settings}
        editing={editing}
        disabled={!canManage}
      />
    );
  } else if (!accessError && editing.query.isError) {
    settingsContent = (
      <RequestError
        message="Les réglages de maintenance sont indisponibles."
        onRetry={() => void editing.query.refetch()}
        retrying={editing.query.isFetching}
      />
    );
  } else if (!accessError) {
    settingsContent = <RequestLoading />;
  }
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Administration technique" />
      <FormScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!editing.content.pending}
              refreshing={editing.query.isFetching || account.isFetching}
              onRefresh={() => {
                if (editing.content.isPending()) return;
                if (canManage) void editing.query.refetch();
                else void account.refetch();
              }}
            />
          ) : undefined
        }
      >
        {sessionStatus === "restoring" ||
        (sessionStatus === "authenticated" && account.isPending) ? (
          <RequestLoading />
        ) : (
          <>
            {accessError}
            {settingsContent}
            {settings && editing.query.isError && (
              <RequestError message="La relecture a échoué. Votre brouillon est conservé." />
            )}
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
});
