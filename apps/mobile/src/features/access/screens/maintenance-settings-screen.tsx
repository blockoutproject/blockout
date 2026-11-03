import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { MaintenanceForm } from "../forms/maintenance-form";
import { MaintenanceLoading } from "../components/settings-loading";
import { ReadFeedback } from "../../../shared/components/read-feedback";
/** Loads only with current grants and retains an existing draft read-only when they become unavailable. */
export function MaintenanceSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);
  const feedback = useActionFeedback();
  const denied =
    isAccessDenied(account.error) || isAccessDenied(editing.query.error);
  const settings =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  /** Explicit refresh reports retained-data failure once and never resets the mounted draft. */
  async function refresh() {
    if (editing.content.isPending) return;
    feedback.clear();
    if (!canManage) {
      const result = await account.refetch();
      if (result.isError && settings) feedback.error();
      return;
    }
    const result = await editing.query.refetch();
    if (result.isError && result.data) feedback.error();
  }
  let accessError = null;
  if (
    sessionStatus === "authenticated" &&
    (account.isError || (account.isPending && !account.isFetching))
  ) {
    accessError = (
      <ErrorState
        onRetry={() => void account.refetch()}
        retrying={account.isFetching}
      />
    );
  } else if (!canManage) {
    accessError = <ErrorState />;
  }
  let settingsContent = null;
  if (settings) {
    settingsContent = (
      <MaintenanceForm
        key={`${session.subject}:${session.accountId}`}
        settings={settings}
        editing={editing}
        disabled={!canManage || denied}
      />
    );
  } else if (!accessError) {
    settingsContent = (
      <ReadFeedback
        query={editing.query}
        loadingContent={<MaintenanceLoading />}
      />
    );
  }
  const pendingAccess =
    sessionStatus === "restoring" ||
    (sessionStatus === "authenticated" && account.isLoading);
  const loadingSettings =
    sessionStatus === "authenticated" &&
    !account.isLoading &&
    !accessError &&
    !settings &&
    editing.query.isLoading;
  return (
    <Page header={<PageHeader title="Administration technique" />}>
      <FormScrollView
        refreshControl={
          settings && sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!editing.content.isPending}
              onRefresh={refresh}
            />
          ) : undefined
        }
      >
        {settings || loadingSettings || pendingAccess ? (
          <PageContent>
            {!settings && pendingAccess ? (
              <MaintenanceLoading />
            ) : (
              settingsContent
            )}
          </PageContent>
        ) : (
          <ScreenState>{accessError ?? settingsContent}</ScreenState>
        )}
      </FormScrollView>
    </Page>
  );
}
