import { Fragment, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { StyleSheet } from "react-native";
import { useAccountSession } from "@/features/accounts/current-account";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import {
  hasReadError,
  ReadFeedback,
  type ReadFeedbackQuery,
} from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { AccessFeedback, type AccessFeedbackProps } from "./access-feedback";

interface AdministrationSettingsPageProps<Settings> {
  account: AccessFeedbackProps["account"] & Pick<UseQueryResult, "isLoading">;
  canManage: boolean;
  query: ReadFeedbackQuery &
    Pick<UseQueryResult<Settings>, "data" | "isLoading">;
  saving: boolean;
  loadingContent: ReactNode;
  renderForm(settings: Settings, disabled: boolean): ReactNode;
}

/** Hides blocked fields without replacing the same account's draft or native scroller. */
export function AdministrationSettingsPage<Settings>({
  account,
  canManage,
  query,
  saving,
  loadingContent,
  renderForm,
}: Readonly<AdministrationSettingsPageProps<Settings>>) {
  const { status, subject, accountId } = useAccountSession();
  const authenticated = status === "authenticated";
  const settings = authenticated ? query.data : undefined;
  const requiredRead =
    account.isPending || hasReadError(account) ? account : query;
  const failed = hasReadError(requiredRead);
  const admitted = authenticated && canManage;
  const blocked = !admitted || requiredRead.isPending || failed;
  const initialLoading =
    status === "restoring" || (!failed && requiredRead.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  async function refresh() {
    if (!saving) {
      await query.refetch();
    }
  }

  return (
    <Page header={<PageHeader title="Administration technique" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            enabled={!blocked && !saving}
            fetching={query.isFetching}
            onRefresh={refresh}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {admitted ? (
              <ReadFeedback
                query={requiredRead}
                loadingContent={loadingContent}
              />
            ) : (
              <AccessFeedback
                sessionStatus={status}
                account={account}
                enabled={canManage}
                loadingContent={loadingContent}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent
          style={blocked ? styles.hidden : undefined}
          accessibilityElementsHidden={blocked}
          importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
        >
          {settings !== undefined && (
            <Fragment key={`${subject}:${accountId}`}>
              {renderForm(settings, blocked)}
            </Fragment>
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
