import { StyleSheet } from "react-native";
import { Page, PageContent } from "@/shared/components/page";
import { AccessFeedback } from "../components/access-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { useAccountSession } from "@/features/accounts/current-account";
import { useAdministrationCapabilities } from "../api/use-administration-capabilities";
import { useMaintenanceSettings } from "../api/use-maintenance-settings";
import { MaintenanceForm } from "../forms/maintenance-form";
import { MaintenanceLoading } from "../components/settings-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";

/** Keeps the authorized visit mounted while required reads replace its editable content. */
export function MaintenanceSettingsScreen() {
  const { permissions, account, sessionStatus } =
    useAdministrationCapabilities();
  const session = useAccountSession();
  const canManage = permissions?.manageMaintenance === true;
  const editing = useMaintenanceSettings(canManage);
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
    if (!editing.content.isPending && !editing.activation.isPending) {
      await editing.query.refetch();
    }
  }

  return (
    <Page header={<PageHeader title="Administration technique" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            enabled={
              !blocked &&
              !editing.content.isPending &&
              !editing.activation.isPending
            }
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
                loadingContent={<MaintenanceLoading />}
              />
            ) : (
              <ReadFeedback
                query={requiredRead}
                loadingContent={<MaintenanceLoading />}
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
            <MaintenanceForm
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
