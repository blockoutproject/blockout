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
import { useApplicationVersionsSettings } from "../api/use-application-versions-settings";
import { ApplicationVersionsForm } from "../forms/application-versions-form";
import { ApplicationVersionsLoading } from "../components/settings-loading";
/** Loads only with current grants and retains an existing draft read-only when they become unavailable. */
export function ApplicationVersionsSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageApplicationVersions === true;
  const editing = useApplicationVersionsSettings(canManage);
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
      <ApplicationVersionsForm
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
    settingsContent = <ApplicationVersionsLoading />;
  }
  const loadingSettings =
    sessionStatus === "authenticated" &&
    !account.isPending &&
    !accessError &&
    !settings &&
    editing.query.isPending;
  return (
    <Page>
      <PageHeader title="Administration technique" />
      <FormScrollView
        refreshControl={
          settings && sessionStatus === "authenticated" ? (
            <DataRefreshControl
              enabled={!editing.content.isPending}
              refreshing={editing.query.isRefetching || account.isRefetching}
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
    </Page>
  );
}
