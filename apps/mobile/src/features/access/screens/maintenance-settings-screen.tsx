import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { Page, PageContent } from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ScreenState } from "../../../shared/components/screen-state";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { FormScrollView } from "../../../shared/components/form-scroll-view";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import { RequestLoading } from "../../../shared/components/request-feedback";
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
  if (account.isError) {
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
  } else if (!accessError && editing.query.isError) {
    settingsContent = (
      <ErrorState
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
    <Page edges={["left", "right", "bottom"]}>
      <ScrollChrome header={<PageHeader title="Administration technique" />}>
        {({ onScroll, headerHeight }) => (
          <FormScrollView
            onScroll={onScroll}
            scrollEventThrottle={16}
            scrollIndicatorInsets={{ top: headerHeight }}
            contentContainerStyle={{ paddingTop: headerHeight }}
            refreshControl={
              settings && sessionStatus === "authenticated" ? (
                <DataRefreshControl
                  progressViewOffset={headerHeight}
                  enabled={!editing.content.isPending}
                  refreshing={
                    editing.query.isRefetching || account.isRefetching
                  }
                  onRefresh={() => void refresh()}
                />
              ) : undefined
            }
          >
            {settings || loadingSettings ? (
              <PageContent>{settingsContent}</PageContent>
            ) : (
              <ScreenState>
                {sessionStatus === "restoring" ||
                (sessionStatus === "authenticated" && account.isPending) ? (
                  <RequestLoading />
                ) : (
                  (accessError ?? settingsContent)
                )}
              </ScreenState>
            )}
          </FormScrollView>
        )}
      </ScrollChrome>
    </Page>
  );
}
