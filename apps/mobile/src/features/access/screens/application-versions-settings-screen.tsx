import { StyleSheet } from "react-native";
import { Page, PageContent } from "@/shared/components/page";
import { AccessFeedback } from "../components/access-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { useAccountSession } from "@/features/accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useApplicationVersionsSettings } from "../api/use-application-versions-settings";
import { ApplicationVersionsForm } from "../forms/application-versions-form";
import { ApplicationVersionsLoading } from "../components/settings-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";

/** Keeps the authorized visit mounted while required reads replace its editable content. */
export function ApplicationVersionsSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageApplicationVersions === true;
  const editing = useApplicationVersionsSettings(canManage);
  const settings =
    sessionStatus === "authenticated" ? editing.query.data : undefined;
  const requiredRead =
    account.isPending || hasReadError(account) ? account : editing.query;
  const blocked =
    sessionStatus !== "authenticated" ||
    !canManage ||
    requiredRead.isPending ||
    hasReadError(requiredRead);
  const initialLoading =
    sessionStatus === "restoring" ||
    (!hasReadError(requiredRead) && requiredRead.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  /** Refreshes only the current read dependency; Query owns failures and retry policy. */
  async function refresh() {
    if (!editing.content.isPending) {
      await editing.query.refetch();
    }
  }

  return (
    <Page header={<PageHeader title="Administration technique" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            enabled={!blocked && !editing.content.isPending}
            fetching={editing.query.isFetching}
            onRefresh={refresh}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {sessionStatus !== "authenticated" || !canManage ? (
              <AccessFeedback
                sessionStatus={sessionStatus}
                account={account}
                enabled={canManage}
                loadingContent={<ApplicationVersionsLoading />}
              />
            ) : (
              <ReadFeedback
                query={requiredRead}
                loadingContent={<ApplicationVersionsLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          {settings && (
            <ApplicationVersionsForm
              key={`${session.subject}:${session.accountId}`}
              settings={settings}
              editing={editing}
              disabled={blocked}
            />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
