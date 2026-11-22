import { StyleSheet } from "react-native";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { SeasonConfirmationLoading } from "../components/collection-loading";
import { useCollectionSeasonCommand } from "../api/use-collection-season";
import { SeasonConfirmationForm } from "../forms/season-confirmation-form";
import { seasonCommands, type SeasonCommand } from "../model/season-command";

/** Keeps the typed draft mounted while current season and admission reads recover. */
export function SeasonConfirmationScreen({
  seasonId,
  command,
}: Readonly<{ seasonId: string; command: SeasonCommand }>) {
  const editing = useCollectionSeasonCommand(seasonId, command);
  const { authority, season } = editing;
  const visitKey = `${authority.session.subject}:${authority.session.accountId}:${seasonId}:${command}`;
  const { verb, label } = seasonCommands[command];
  const title = season.data ? `${verb} ${season.data.label} ?` : label;
  const failedRead = [authority.account, season].find(hasReadError);
  const blocked = !authority.enabled || !season.data || !!failedRead;
  const initialLoading = !authority.enabled
    ? isAccessLoading(authority)
    : !failedRead && season.isLoading;
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title={title} />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={season.isFetching}
            enabled={!blocked && !editing.submit.isPending}
            onRefresh={() => season.refetch({ cancelRefetch: false })}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<SeasonConfirmationLoading />}
              />
            ) : (
              <ReadFeedback
                query={failedRead ?? season}
                loadingContent={<SeasonConfirmationLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          <SeasonConfirmationForm
            key={visitKey}
            blocked={blocked}
            command={command}
            editing={editing}
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
