import { ScreenState } from "../../../shared/components/screen-state";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { StyleSheet } from "react-native";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "../../../shared/components/page-header";
import {
  AccessDenied,
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { MaintenanceForm } from "../forms/maintenance-form";
import { MaintenanceLoading } from "../components/settings-loading";

/** Loads only with current grants and retains an existing draft read-only when they become unavailable. */
export function MaintenanceSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);
  const { colors } = useTheme();
  const feedback = useActionFeedback();
  const denied =
    isAccessDenied(account.error) || isAccessDenied(editing.query.error);
  const settings =
    sessionStatus === "authenticated" ? editing.query.data : undefined;

  /** Explicit refresh reports retained-data failure once and never resets the mounted draft. */
  async function refresh() {
    if (editing.content.isPending()) return;
    feedback.clear();
    if (!canManage) {
      await account.refetch();
      return;
    }
    const result = await editing.query.refetch();
    if (
      session.isCurrent(session.generation) &&
      result.isError &&
      result.data &&
      !isAccessDenied(result.error)
    )
      feedback.error("L’actualisation a échoué. Votre brouillon est conservé.");
  }
  let accessError = null;
  if (denied) {
    accessError = <AccessDenied />;
  } else if (account.isError) {
    accessError = (
      <RequestError
        message="Les permissions du compte sont indisponibles."
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!canManage) {
    accessError = (
      <AccessDenied message="Cette action nécessite une permission dédiée." />
    );
  }
  let settingsContent = null;
  if (settings) {
    settingsContent = (
      <MaintenanceForm
        key={`${session.generation}:${session.accountId}`}
        settings={settings}
        editing={editing}
        disabled={!canManage || denied}
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
    settingsContent = <MaintenanceLoading />;
  }
  const loadingSettings =
    sessionStatus === "authenticated" &&
    !account.isPending &&
    !accessError &&
    !settings &&
    editing.query.isPending;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title="Administration technique" />
      <FormScrollView
        contentContainerStyle={[
          styles.content,
          loadingSettings && styles.loadingContent,
        ]}
        refreshControl={
          sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!editing.content.pending}
              refreshing={editing.query.isRefetching || account.isRefetching}
              onRefresh={() => void refresh()}
            />
          ) : undefined
        }
      >
        {loadingSettings ? (
          settingsContent
        ) : !settings ? (
          <ScreenState>
            {sessionStatus === "restoring" ||
            (sessionStatus === "authenticated" && account.isPending) ? (
              <RequestLoading />
            ) : (
              (accessError ?? settingsContent)
            )}
          </ScreenState>
        ) : (
          <>
            {accessError}
            {settingsContent}
          </>
        )}
      </FormScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.lg },
  loadingContent: { paddingTop: tokens.spacing.md },
});
